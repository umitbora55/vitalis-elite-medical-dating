import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  claimVerificationRequest,
  decideVerificationRequest,
  fetchAuditLogs,
  fetchVerificationCase,
  fetchVerificationQueue,
  getAdminSettings,
  getVerificationDocSignedUrl,
  isAdminSession,
  saveAdminSettings,
} from '../../services/adminModerationService';

type AdminTab = 'inbox' | 'case' | 'settings' | 'audit';

type QueueItem = Awaited<ReturnType<typeof fetchVerificationQueue>>['items'][number];
type CaseState = Awaited<ReturnType<typeof fetchVerificationCase>>['data'];

const STATUS_FILTERS = ['PENDING', 'UNDER_REVIEW', 'NEED_MORE_INFO', 'APPROVED', 'REJECTED'] as const;

export const AdminPanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tab, setTab] = useState<AdminTab>('inbox');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [caseData, setCaseData] = useState<CaseState>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [auditLogs, setAuditLogs] = useState<Awaited<ReturnType<typeof fetchAuditLogs>>['data']>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');

  const loadQueue = useCallback(async () => {
    const { items, error } = await fetchVerificationQueue({ status: [statusFilter] });
    if (!error) setQueue(items);
  }, [statusFilter]);

  const loadCase = useCallback(async (requestId: string) => {
    const [{ data }, docs] = await Promise.all([
      fetchVerificationCase(requestId),
      getVerificationDocSignedUrl(requestId),
    ]);
    setCaseData(data);
    if (docs.data.length > 0) {
      setDocUrls(Object.fromEntries(docs.data.map((entry) => [entry.docId, entry.signedUrl])));
    } else {
      setDocUrls({});
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const session = await isAdminSession();
      if (!session.isAdmin) {
        setAuthError(session.error ?? 'Admin access is required.');
        setIsLoading(false);
        return;
      }
      if (!session.isMfaReady) {
        setAuthError('MFA (aal2) is required for moderator and admin access.');
        setIsLoading(false);
        return;
      }

      const [queueResp, settingsResp, auditResp] = await Promise.all([
        fetchVerificationQueue({ status: ['PENDING'] }),
        getAdminSettings(),
        fetchAuditLogs(50),
      ]);

      setQueue(queueResp.items);
      setSettings(Object.fromEntries((settingsResp.data || []).map((item) => [item.key, item.value])));
      setAuditLogs(auditResp.data || []);
      setIsLoading(false);
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    void loadQueue();
  }, [isLoading, loadQueue]);

  useEffect(() => {
    if (!selectedRequestId) return;
    void loadCase(selectedRequestId);
  }, [selectedRequestId, loadCase]);

  const handleClaim = useCallback(async (requestId: string) => {
    const { error } = await claimVerificationRequest(requestId);
    if (error) return;
    await loadQueue();
    setSelectedRequestId(requestId);
    setTab('case');
  }, [loadQueue]);

  const handleDecision = useCallback(async (decision: 'approve' | 'reject' | 'need_more_info') => {
    if (!selectedRequestId) return;
    const { error } = await decideVerificationRequest({
      requestId: selectedRequestId,
      decision,
      reasonCode: decision === 'reject' ? decisionReason || 'MANUAL_REVIEW_REJECTED' : null,
      notes: decisionNotes || null,
      templateMessage: decision === 'need_more_info' ? decisionNotes : null,
    });
    if (error) return;
    setDecisionNotes('');
    setDecisionReason('');
    await Promise.all([loadQueue(), loadCase(selectedRequestId)]);
  }, [decisionNotes, decisionReason, loadCase, loadQueue, selectedRequestId]);

  const pendingCount = useMemo(
    () => queue.filter((item) => item.status === 'PENDING' || item.status === 'UNDER_REVIEW').length,
    [queue],
  );

  const saveSettings = useCallback(async () => {
    const entries = Object.entries(settings).map(([key, value]) => ({ key, value }));
    await saveAdminSettings(entries);
  }, [settings]);

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 p-8">Loading admin panel...</div>;
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <div className="max-w-lg mx-auto rounded-xl border border-red-900 bg-red-950/30 p-5">
          <h1 className="text-xl font-semibold mb-2">Admin access blocked</h1>
          <p className="text-sm text-red-200">{authError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-900/90 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Vitalis Admin Moderation</h1>
          <p className="text-xs text-slate-400">Pending queue: {pendingCount}</p>
        </div>
        <div className="flex gap-2 text-sm">
          <button className={`px-3 py-1.5 rounded ${tab === 'inbox' ? 'bg-gold-500 text-black' : 'bg-slate-800'}`} onClick={() => setTab('inbox')}>Inbox</button>
          <button className={`px-3 py-1.5 rounded ${tab === 'case' ? 'bg-gold-500 text-black' : 'bg-slate-800'}`} onClick={() => setTab('case')}>Case</button>
          <button className={`px-3 py-1.5 rounded ${tab === 'settings' ? 'bg-gold-500 text-black' : 'bg-slate-800'}`} onClick={() => setTab('settings')}>Settings</button>
          <button className={`px-3 py-1.5 rounded ${tab === 'audit' ? 'bg-gold-500 text-black' : 'bg-slate-800'}`} onClick={() => setTab('audit')}>Audit</button>
        </div>
      </div>

      {tab === 'inbox' && (
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-300" htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm"
            >
              {STATUS_FILTERS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900">
                <tr>
                  <th className="text-left p-3">User</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Email Type</th>
                  <th className="text-left p-3">Submitted</th>
                  <th className="text-left p-3">Claim</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                    <td className="p-3">
                      <button className="text-left text-gold-300 hover:text-gold-200" onClick={() => { setSelectedRequestId(item.id); setTab('case'); }}>
                        {item.requestorName || item.userId}
                      </button>
                    </td>
                    <td className="p-3">{item.status}</td>
                    <td className="p-3">{item.emailType || '-'}</td>
                    <td className="p-3">{item.submittedAt ? new Date(item.submittedAt).toLocaleString() : '-'}</td>
                    <td className="p-3">
                      <button className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600" onClick={() => void handleClaim(item.id)}>Claim</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'case' && (
        <div className="p-6 space-y-5">
          {!caseData && <p className="text-sm text-slate-400">Select a request from Inbox.</p>}
          {caseData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-800 p-4">
                  <p className="text-xs text-slate-400 mb-1">Request</p>
                  <p className="font-medium">{caseData.requestId}</p>
                  <p className="text-xs text-slate-400 mt-2">Status: {caseData.status}</p>
                  <p className="text-xs text-slate-400">Submitted: {caseData.submittedAt ? new Date(caseData.submittedAt).toLocaleString() : '-'}</p>
                </div>
                <div className="rounded-xl border border-slate-800 p-4">
                  <p className="text-xs text-slate-400 mb-1">Requestor</p>
                  <p className="font-medium">{caseData.requestor.name || caseData.requestor.id}</p>
                  <p className="text-xs text-slate-400">{caseData.requestor.city || '-'}</p>
                  <p className="text-xs text-slate-400">Verification: {caseData.requestor.verificationStatus || '-'}</p>
                </div>
                <div className="rounded-xl border border-slate-800 p-4">
                  <p className="text-xs text-slate-400 mb-1">Decision</p>
                  <input value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} placeholder="reason_code (reject)" className="w-full mb-2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm" />
                  <textarea value={decisionNotes} onChange={(event) => setDecisionNotes(event.target.value)} placeholder="notes / template message" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm min-h-20" />
                  <div className="flex gap-2 mt-2">
                    <button className="px-3 py-1 rounded bg-green-600" onClick={() => void handleDecision('approve')}>Approve</button>
                    <button className="px-3 py-1 rounded bg-yellow-600" onClick={() => void handleDecision('need_more_info')}>Need Info</button>
                    <button className="px-3 py-1 rounded bg-red-600" onClick={() => void handleDecision('reject')}>Reject</button>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 p-4">
                <p className="text-sm font-medium mb-2">Documents</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {caseData.documents.map((doc) => (
                    <div key={doc.id} className="rounded-lg border border-slate-700 p-3">
                      <p className="text-xs text-slate-400">{doc.docType || 'DOCUMENT'} · {doc.mime || '-'}</p>
                      <a
                        href={docUrls[doc.id]}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-gold-300 break-all"
                      >
                        {doc.storagePath}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="p-6 space-y-4 max-w-2xl">
          {['verification_policy', 'allowlist_domains', 'denylist_domains', 'retention_days', 'sla_hours', 'limited_actions'].map((key) => (
            <label key={key} className="block">
              <span className="text-xs text-slate-400 uppercase">{key}</span>
              <input
                value={settings[key] ?? ''}
                onChange={(event) => setSettings((prev) => ({ ...prev, [key]: event.target.value }))}
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
              />
            </label>
          ))}
          <button className="px-4 py-2 rounded bg-gold-500 text-black font-medium" onClick={() => void saveSettings()}>Save Settings</button>
        </div>
      )}

      {tab === 'audit' && (
        <div className="p-6">
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900">
                <tr>
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">Actor Role</th>
                  <th className="text-left p-3">Action</th>
                  <th className="text-left p-3">Entity</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((item) => (
                  <tr key={item.id} className="border-t border-slate-800">
                    <td className="p-3">{new Date(item.createdAt).toLocaleString()}</td>
                    <td className="p-3">{item.actorRole}</td>
                    <td className="p-3">{item.action}</td>
                    <td className="p-3">{item.entity} / {item.entityId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

