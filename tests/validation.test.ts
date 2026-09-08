import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateItemStatus, evaluateValue, calculateOverallResults, parseReading } from '../src/utils/evaluation';
import { parseDynProFile, extractDataPointsFromText, calculateJISCorrection, applyJISFactorToDataset, findNearestRatedPoint, extractSamplingPoints, validateDynProDataset } from '../src/utils/dynoPerformance';
import { submissionErrors, approvalErrors, canEditTest, canDeleteTest, isOfficialCertificate } from '../src/utils/testWorkflow';
import type { TestResultItem, TestRecord, User } from '../src/types';

const item = (patch: Partial<TestResultItem> = {}): TestResultItem => ({parameterId:'p',order:1,parameterName:'Oil Pressure',specType:'MINIMUM',specText:'Minimum 10',unit:'bar',bankConfig:'SINGLE',minValue:10,required:true,actualValue:10,status:'PASS',...patch});
const qc: User = {id:'qc',name:'QC Test',employeeId:'100',role:'QC_TESTER',email:'qc@example.invalid',department:'QA',active:true};
const supervisor: User = {...qc,id:'spv',name:'Supervisor Test',employeeId:'200',role:'SUPERVISOR'};
const record = (patch: Partial<TestRecord> = {}): TestRecord => ({id:'r',certificateNumber:'TEST-ONLY',workflowStatus:'WAITING_APPROVAL',overallResult:'PASS',productId:'p',productType:'TORQUE CONVERTER ASSY',productName:'Test',jobOrder:'2410000000',typeModel:'TEST',serialNumber:'TEST-SN',componentPartNumber:'TEST-PN',machineModel:'TEST',testBenchCode:'TB-01',testBenchName:'Test bench',testDate:'2026-09-08',testerId:qc.id,testerName:qc.name,testerEmployeeId:qc.employeeId,testerSignature:'test-signature',results:[item()],totalParameters:1,passedParameters:1,failedParameters:0,approvals:[],createdAt:'2026-09-08',updatedAt:'2026-09-08',...patch});
const points = [{lineNumber:4,rpm:1200,rawPower:500,rawTorque:300},{lineNumber:5,rpm:1500,rawPower:600,rawTorque:280},{lineNumber:6,rpm:1900,rawPower:700,rawTorque:260}];

for (const text of ['NOT GOOD',' ng ','NOK','FAIL','REJECT']) test(`Qualitative ${text} fails`, () => assert.equal(evaluateItemStatus(item({specType:'TEXT',actualValue:text})).status,'FAIL'));
for (const text of ['GOOD',' OK ','PASS','NORMAL']) test(`Qualitative ${text} passes`, () => assert.equal(evaluateItemStatus(item({specType:'TEXT',actualValue:text})).status,'PASS'));
for (const text of ['YES','NO','unknown','GOOD ENOUGH','']) test(`Unmapped ${JSON.stringify(text)} stays pending`, () => assert.equal(evaluateItemStatus(item({specType:'TEXT',actualValue:text})).status,'PENDING'));
test('Explicit YES/NO mapping controls result', () => {
  const mapped = item({specType:'TEXT',textPassValues:['NO'],textFailValues:['YES']});
  assert.equal(evaluateItemStatus({...mapped,actualValue:'YES'}).status,'FAIL');
  assert.equal(evaluateItemStatus({...mapped,actualValue:'NO'}).status,'PASS');
});
test('Invalid standards and readings never pass', () => {
  assert.equal(evaluateValue(100,'MINIMUM'),'PENDING');
  assert.equal(evaluateValue(100,'MIN_MAX',10),'PENDING');
  assert.equal(evaluateValue(100,'MIN_MAX',200,10),'PENDING');
  assert.equal(evaluateValue(100,'TARGET_TOLERANCE',undefined,undefined,100,-1),'PENDING');
  for (const val of [NaN,Infinity,-Infinity,null,undefined]) assert.equal(evaluateValue(val,'MINIMUM',10),'PENDING');
  assert.equal(parseReading('100abc'),undefined);
  assert.equal(parseReading('0x10'),undefined);
  assert.equal(parseReading('1e2'),100);
  assert.equal(evaluateItemStatus(item({actualValue:'100abc'})).status,'PENDING');
});
test('Numeric specification boundaries are inclusive', () => {
  assert.equal(evaluateValue(10,'MINIMUM',10),'PASS');
  assert.equal(evaluateValue(9.99,'MINIMUM',10),'FAIL');
  assert.equal(evaluateValue(10,'MAXIMUM',undefined,10),'PASS');
  assert.equal(evaluateValue(10.01,'MAXIMUM',undefined,10),'FAIL');
  assert.equal(evaluateValue(90,'TARGET_TOLERANCE',undefined,undefined,100,10),'PASS');
  assert.equal(evaluateValue(110.001,'TARGET_TOLERANCE',undefined,undefined,100,10),'FAIL');
});
test('RH/LH fail is not hidden by an empty side; incomplete submission still blocked', () => {
  const incomplete = item({bankConfig:'RH_LH',actualRh:1,actualLh:undefined});
  assert.equal(evaluateItemStatus(incomplete).status,'FAIL');
  assert.ok(submissionErrors(record({results:[incomplete]})).length);
});
test('Optional blank is skipped, optional failure counts, and empty tests never pass', () => {
  const optional = item({required:false,actualValue:undefined});
  const summary = calculateOverallResults([item(),optional]);
  assert.equal(summary.overallResult,'PASS');
  assert.equal(summary.passedParameters,1);
  assert.equal(summary.skippedParameters,1);
  assert.equal(calculateOverallResults([optional]).overallResult,'PENDING');
  assert.equal(calculateOverallResults([]).overallResult,'PENDING');
  assert.equal(calculateOverallResults([item(),{...optional,actualValue:1}]).overallResult,'FAIL');
});
test('Evaluation recalculates readings instead of trusting stored PASS', () => assert.equal(calculateOverallResults([item({actualValue:0,status:'PASS'})]).overallResult,'FAIL'));
test('Failed complete reports may be submitted but never approved', () => {
  const failed = record({results:[item({actualValue:0})],overallResult:'FAIL'});
  assert.deepEqual(submissionErrors(failed),[]);
  assert.ok(approvalErrors(failed,supervisor,'sig').length);
});
test('Approval requires waiting state, active supervisor, signature and no self approval', () => {
  assert.deepEqual(approvalErrors(record(),supervisor,'sig'),[]);
  for (const status of ['DRAFT','APPROVED','REJECTED'] as const) assert.ok(approvalErrors(record({workflowStatus:status}),supervisor,'sig').length);
  assert.ok(approvalErrors(record(),qc,'sig').length);
  assert.ok(approvalErrors(record(),{...supervisor,active:false},'sig').length);
  assert.ok(approvalErrors(record(),supervisor,'').length);
  assert.ok(approvalErrors(record(),{...supervisor,id:qc.id},'sig').length);
  assert.ok(approvalErrors(record({overallResult:'PENDING'}),supervisor,'sig').length);
  assert.ok(approvalErrors(record({results:[item({actualValue:undefined})]}),supervisor,'sig').length);
});
test('Submitted and approved records cannot be edited or deleted', () => {
  for (const status of ['WAITING_APPROVAL','APPROVED'] as const) {
    assert.equal(canEditTest(record({workflowStatus:status}),qc),false);
    assert.equal(canDeleteTest(record({workflowStatus:status}),{...qc,role:'ADMIN'}),false);
  }
  assert.equal(canEditTest(record({workflowStatus:'REJECTED'}),qc),true);
  assert.equal(canDeleteTest(record({workflowStatus:'DRAFT'}),{...qc,id:'other'}),false);
});
test('Demo and unverified legacy performance sources cannot be submitted', () => {
  assert.ok(submissionErrors(record({isDemo:true})).length);
  const engine = record({productType:'ENGINE ASSY',performanceData:points,jisFactor:1,performanceConfirmed:true,dynProFile:{fileName:'report.txt',fileSize:30,fileType:'text/plain',uploadedAt:'2026-09-08'}});
  assert.ok(submissionErrors(engine).length);
  const imported = {...engine,dynProFile:{...engine.dynProFile!,source:'TEXT' as const}};
  assert.deepEqual(submissionErrors(imported),[]);
  assert.ok(submissionErrors({...imported,performanceConfirmed:false}).length);
  assert.ok(submissionErrors({...imported,jisFactor:0}).length);
});
test('Official release certificate requires approved valid results and separate signatures', () => {
  const approved = record({workflowStatus:'APPROVED',supervisorSignature:'sig',supervisorId:supervisor.id,supervisorEmployeeId:supervisor.employeeId,supervisorName:supervisor.name});
  assert.equal(isOfficialCertificate(approved),true);
  assert.equal(isOfficialCertificate({...approved,results:[item({actualValue:0})]}),false);
  assert.equal(isOfficialCertificate({...approved,overallResult:'PENDING'}),false);
  assert.equal(isOfficialCertificate({...approved,isDemo:true}),false);
  assert.equal(isOfficialCertificate(record()),false);
});
test('Malformed import rejects without fallback measurements', async () => {
  for (const content of ['invalid report', '', 'RPM Power Torque\n1200 500abc 300']) {
    const file = new File([content],'invalid.txt',{type:'text/plain'});
    await assert.rejects(parseDynProFile(file));
  }
});
test('Strict parser preserves row numbers and decimal measurements', () => {
  const data = extractDataPointsFromText('Line RPM Power Torque\n4 1200.5 500.23 300.17\n5 1500 600 280\n6 1900 700 260');
  assert.equal(data[0].lineNumber,4);
  assert.equal(data[0].rawPower,500.23);
  assert.equal(validateDynProDataset(data).validData[0].rpm,1200.5);
  assert.throws(() => extractDataPointsFromText('1200,500abc,300'));
  assert.throws(() => extractDataPointsFromText('1,1200,500,300,999'));
});
test('Valid import preserves actual measurements and provenance', async () => {
  // Minimal FileReader adapter for Node; parsing and validation are the real production functions.
  const previous = globalThis.FileReader;
  globalThis.FileReader = class { result = ''; onload?: () => void; onerror?: () => void; async readAsDataURL(file: File) { this.result = 'data:text/plain;base64,' + Buffer.from(await file.arrayBuffer()).toString('base64'); this.onload?.(); }} as unknown as typeof FileReader;
  try {
    const file = new File(['RPM Power Torque\n1200,500,300\n1500,600,280\n1900,700,260'],'actual.txt',{type:'text/plain'});
    const parsed = await parseDynProFile(file);
    assert.equal(parsed.source,'text_parsed');
    assert.equal(parsed.fileInfo.source,'TEXT');
    assert.equal(parsed.data.length,3);
    assert.equal(parsed.data[0].rawPower,500);
    assert.ok(parsed.fileInfo.fileData);
  } finally {globalThis.FileReader = previous;}
});
test('JIS rejects invalid factors and correction is applied once', () => {
  for (const factor of [NaN,Infinity,0,-1]) assert.throws(() => calculateJISCorrection(100,20,factor));
  const corrected = applyJISFactorToDataset(points,1.1);
  const rated = findNearestRatedPoint(corrected,1900,'power',1.1)!;
  assert.equal(rated.correctedHp,770);
  assert.equal(rated.rawHp,700);
  const reCorrected = findNearestRatedPoint(corrected,1900,'power',1.2)!;
  assert.equal(reCorrected.correctedHp,840);
});
test('Sampling uses the same measured row; duplicate RPMs do not satisfy minimum data', () => {
  const sampled = extractSamplingPoints(points,1);
  const at1200 = sampled.find(point => point.targetRpm === 1200)!;
  assert.equal(at1200.lineNumber,4);
  assert.equal(at1200.rawPower,500);
  assert.equal(at1200.rawTorque,300);
  assert.equal(validateDynProDataset([points[0],points[0],points[0]]).isValid,false);
});

test('Pending certificate renders as a report, not a failed or released product', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { CertificateView } = await import('../src/components/CertificateView');
  const pending = record({workflowStatus:'DRAFT',overallResult:'PENDING',results:[item({actualValue:undefined,status:'PENDING'})]});
  const html = renderToStaticMarkup(createElement(CertificateView,{record:pending,onClose:()=>{}}));
  assert.match(html,/PENDING \(BELUM LENGKAP\)/);
  assert.doesNotMatch(html,/FAILED \(TIDAK LULUS\)/);
  assert.doesNotMatch(html,/DINYATAKAN LULUS/);
  assert.match(html,/NOT A RELEASE CERTIFICATE/);
  assert.equal((html.match(/DRAFT — PENDING/g) ?? []).length,2);
});
test('Unapproved PASS report has no official release conclusion', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { CertificateView } = await import('../src/components/CertificateView');
  const html = renderToStaticMarkup(createElement(CertificateView,{record:record(),onClose:()=>{}}));
  assert.match(html,/PASS — BELUM DISAHKAN/);
  assert.doesNotMatch(html,/DINYATAKAN LULUS/);
});
test('Legacy inconsistent approved report is flagged without mutating its stored result', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { CertificateView } = await import('../src/components/CertificateView');
  const legacy = record({workflowStatus:'APPROVED',results:[item({actualValue:0,status:'PASS'})]});
  const before = JSON.stringify(legacy);
  const html = renderToStaticMarkup(createElement(CertificateView,{record:legacy,onClose:()=>{}}));
  assert.match(html,/VERIFICATION REQUIRED/);
  assert.equal(JSON.stringify(legacy),before);
});
test('Draft with invalid JIS factor renders without fabricating a default correction', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { CertificateView } = await import('../src/components/CertificateView');
  const draft = record({workflowStatus:'DRAFT',overallResult:'PENDING',jisFactor:0,performanceData:points});
  const html = renderToStaticMarkup(createElement(CertificateView,{record:draft,onClose:()=>{}}));
  assert.match(html,/NOT PROVIDED/);
  assert.doesNotMatch(html,/DINYATAKAN LULUS/);
});
