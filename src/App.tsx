import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar, NavView } from './components/Sidebar';
import { DynoTestRecords } from './components/DynoTestRecords';
import { DynoTestForm } from './components/DynoTestForm';
import { MasterProducts } from './components/MasterProducts';
import { UserManagement } from './components/UserManagement';
import { AuditTrailView } from './components/AuditTrailView';
import { CertificateView } from './components/CertificateView';
import { SupervisorApprovalModal } from './components/SupervisorApprovalModal';
import { AccessDenied } from './components/AccessDenied';
import { LoginPage } from './components/LoginPage';
import { GoogleDriveArchive } from './components/GoogleDriveArchive';
import { TestRecord } from './types';

const AppContent: React.FC = () => {
  const { currentUser, isAuthenticated } = useApp();
  const [currentView, setCurrentView] = useState<NavView>('records');
  const [editingRecord, setEditingRecord] = useState<TestRecord | null>(null);
  const [viewingCertRecord, setViewingCertRecord] = useState<TestRecord | null>(null);
  const [reviewingRecord, setReviewingRecord] = useState<TestRecord | null>(null);

  // When unauthenticated or after logout, ensure all temporary and view states are clean
  React.useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setEditingRecord(null);
      setViewingCertRecord(null);
      setReviewingRecord(null);
      setCurrentView('records');
    }
  }, [isAuthenticated, currentUser]);

  // If not authenticated or no active user session, force Login screen
  if (!isAuthenticated || !currentUser) {
    return <LoginPage onLoginSuccess={() => setCurrentView('records')} />;
  }

  // Quick navigation handlers
  const handleNewTest = () => {
    if (currentUser.role !== 'QC_TESTER') {
      alert('Access Denied: Dyno Test creation is strictly restricted to QC Testers.');
      return;
    }
    setEditingRecord(null);
    setCurrentView('new_dyno_test');
  };

  const handleEditTest = (record: TestRecord) => {
    if (currentUser.role !== 'QC_TESTER') {
      alert('Access Denied: Modifying Dyno Test records is strictly restricted to QC Testers.');
      return;
    }
    setEditingRecord(record);
    setCurrentView('new_dyno_test');
  };

  const handleViewRecord = (record: TestRecord) => {
    if (record.workflowStatus === 'APPROVED') {
      setViewingCertRecord(record);
    } else if (record.workflowStatus === 'WAITING_APPROVAL') {
      if (currentUser.role === 'SUPERVISOR') {
        setReviewingRecord(record);
      } else {
        // Admin or QC Tester gets read-only view
        setViewingCertRecord(record);
      }
    } else {
      // Draft or Rejected
      if (currentUser.role === 'QC_TESTER') {
        setEditingRecord(record);
        setCurrentView('new_dyno_test');
      } else {
        // Admin or Supervisor gets read-only view
        setViewingCertRecord(record);
      }
    }
  };

  const handlePreviewCertificate = (record: TestRecord) => {
    setViewingCertRecord(record);
  };

  const handleDownloadCertificate = (record: TestRecord) => {
    setViewingCertRecord(record);
  };

  const handleReviewApproval = (record: TestRecord) => {
    if (currentUser.role !== 'SUPERVISOR') {
      alert('Access Denied: Supervisor permission required.');
      return;
    }
    setReviewingRecord(record);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Corporate Header with Authenticated Profile & Logout */}
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar currentView={currentView} onNavigate={(view) => setCurrentView(view)} />

        {/* Main Content Area with Strict Role Guard Enforcements */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* VIEW: MAIN OPERATIONAL DYNO TEST RECORDS */}
          {currentView === 'records' && (
            <DynoTestRecords
              onNewTest={handleNewTest}
              onEditTest={handleEditTest}
              onViewRecord={handleViewRecord}
              onReviewApproval={handleReviewApproval}
              onPreviewCertificate={handlePreviewCertificate}
              onDownloadCertificate={handleDownloadCertificate}
            />
          )}

          {/* VIEW: NEW / EDIT DYNO TEST FORM (QC Tester Only) */}
          {currentView === 'new_dyno_test' && (
            currentUser.role !== 'QC_TESTER' ? (
              <AccessDenied
                requiredRole="QC_TESTER"
                message="Access Denied – Dyno Test execution and result recording are strictly restricted to QC Testers."
                onGoBack={() => setCurrentView('records')}
              />
            ) : (
              <DynoTestForm
                initialRecord={editingRecord}
                onCancel={() => {
                  setEditingRecord(null);
                  setCurrentView('records');
                }}
                onSuccess={(saved) => {
                  setEditingRecord(null);
                  setCurrentView('records');
                  if (saved.workflowStatus === 'APPROVED') {
                    setViewingCertRecord(saved);
                  }
                }}
              />
            )
          )}

          {/* VIEW: WAITING APPROVAL QUEUE (Supervisor Only) */}
          {currentView === 'approvals' && (
            currentUser.role !== 'SUPERVISOR' ? (
              <AccessDenied
                requiredRole="SUPERVISOR"
                message="Access Denied – Supervisor permission required. Only Quality Supervisors are authorized to review and approve test records."
                onGoBack={() => setCurrentView('records')}
              />
            ) : (
              <DynoTestRecords
                isApprovalQueueOnly
                onNewTest={handleNewTest}
                onEditTest={handleEditTest}
                onViewRecord={handleViewRecord}
                onReviewApproval={handleReviewApproval}
                onPreviewCertificate={handlePreviewCertificate}
                onDownloadCertificate={handleDownloadCertificate}
              />
            )
          )}

          {/* MASTER 1: MASTER PRODUCTS (ADMIN ONLY) */}
          {currentView === 'master_products' && (
            currentUser.role !== 'ADMIN' ? (
              <AccessDenied
                requiredRole="ADMIN"
                message="Access Denied – Administrator permission required."
                onGoBack={() => setCurrentView('records')}
              />
            ) : (
              <MasterProducts />
            )
          )}

          {/* MASTER 2: USER & SIGNATURE SETUP (ADMIN ONLY) */}
          {currentView === 'users' && (
            currentUser.role !== 'ADMIN' ? (
              <AccessDenied
                requiredRole="ADMIN"
                message="Access Denied – Administrator permission required."
                onGoBack={() => setCurrentView('records')}
              />
            ) : (
              <UserManagement />
            )
          )}

          {/* VIEW: AUDIT TRAIL (ADMIN ONLY) */}
          {currentView === 'audit_trail' && (
            currentUser.role !== 'ADMIN' ? (
              <AccessDenied
                requiredRole="ADMIN"
                message="Access Denied – Administrator permission required."
                onGoBack={() => setCurrentView('records')}
              />
            ) : (
              <AuditTrailView />
            )
          )}

          {/* VIEW: GOOGLE DRIVE CLOUD ARCHIVE (ALL AUTHENTICATED ROLES) */}
          {currentView === 'google_drive' && <GoogleDriveArchive />}
        </main>
      </div>

      {/* FULL-SCREEN QUALITY CERTIFICATE PREVIEW MODAL */}
      {viewingCertRecord && (
        <CertificateView
          record={viewingCertRecord}
          onClose={() => setViewingCertRecord(null)}
        />
      )}

      {/* SUPERVISOR APPROVAL & REVIEW MODAL (SUPERVISOR ONLY) */}
      {reviewingRecord && currentUser.role === 'SUPERVISOR' && (
        <SupervisorApprovalModal
          record={reviewingRecord}
          onClose={() => setReviewingRecord(null)}
          onSuccess={() => {
            setReviewingRecord(null);
            setCurrentView('records');
          }}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;

