import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MoyFilter, MoyTransaction, MoyTransactionInput, PaymentMode, TransactionType } from '../types/domain';
import { createMoyTransaction, deleteMoyTransaction, getMoyPlaces, searchMoyTransactions, updateMoyTransaction } from '../api/moyApi';
import { exportTransactionsExcel } from '../api/dataApi';
import { todayIso } from '../utils/format';
import { DataTable } from '../components/DataTable';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { ExcelImportModal } from '../components/ExcelImportModal';
import { ExcelIcon } from '../components/ExcelIcon';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { useToast } from '../components/Toast';

const PAYMENT_MODES: PaymentMode[] = ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER'];

const EMPTY_FORM: MoyTransactionInput = {
  personName: '', transactionType: 'GIVEN', amount: 0,
  paymentMode: 'CASH', transactionDate: todayIso(), place: '', notes: '',
};

export function MoyTransactions() {
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [rows, setRows] = useState<MoyTransaction[]>([]);
  const [filter, setFilter] = useState<MoyFilter>({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MoyTransaction | null>(null);
  const [form, setForm] = useState<MoyTransactionInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<MoyTransaction | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { notify } = useToast();

  // Existing Place values, used purely as autocomplete suggestions in the
  // Add/Edit form — typing any other value is always allowed and saved as-is.
  const [placeOptions, setPlaceOptions] = useState<string[]>([]);

  const load = () => {
    searchMoyTransactions({ ...filter, page })
      .then((p) => {
        // e.g. the last row on the last page was just deleted: step back a page.
        if (p.content.length === 0 && page > 0) { setPage(page - 1); return; }
        setRows(p.content);
        setTotalPages(p.totalPages);
      })
      .catch(() => notify('Failed to load transactions', 'error'));
  };

  useEffect(load, [page, filter]);

  // Load Place suggestions once (and again after a save, in case a brand new
  // Place was just introduced).
  const loadPlaceOptions = () => {
    getMoyPlaces().then(setPlaceOptions).catch(() => {
      // Suggestions are a convenience only — silently proceed without them if this fails.
    });
  };
  useEffect(loadPlaceOptions, []);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM, transactionDate: todayIso() }); setFormError(null); setShowForm(true); };
  const openEdit = (t: MoyTransaction) => {
    setEditing(t);
    setForm({ personName: t.personName, transactionType: t.transactionType, amount: t.amount, paymentMode: t.paymentMode, transactionDate: t.transactionDate, place: t.place, notes: t.notes });
    setFormError(null);
    setShowForm(true);
  };

  const validate = (): string | null => {
    if (!form.personName || !form.personName.trim()) return 'Person Name is required.';
    if (!form.transactionType) return 'Transaction type is required.';
    if (!form.amount || form.amount <= 0) return 'Amount must be greater than zero.';
    if (!form.transactionDate) return 'Transaction date is required.';
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }
    try {
      if (editing) {
        await updateMoyTransaction(editing.transactionId, form);
        notify('Transaction updated');
      } else {
        await createMoyTransaction(form);
        notify('Transaction saved');
      }
      setShowForm(false);
      load();
      loadPlaceOptions();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Save failed — please check the details and try again', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteMoyTransaction(toDelete.transactionId);
      notify('Transaction deleted');
      setToDelete(null);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  /**
   * Exports every transaction matching the current filter (not just the page on
   * screen). Columns mirror what Import Excel accepts, so the file can be re-imported.
   */
  const exportToExcel = async () => {
    setExporting(true);
    try {
      const count = await exportTransactionsExcel(filter);
      notify(`Exported ${count} transaction(s)`);
    } catch {
      notify('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Moy Transactions</h2>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openCreate}>Add Transaction</button>
          <button className="btn btn-secondary btn-icon" onClick={() => setShowImport(true)}>
            <ExcelIcon /> Import Excel
          </button>
          <button className="btn btn-secondary btn-icon" disabled={exporting} onClick={exportToExcel}>
            <ExcelIcon /> {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <input aria-label="Filter by person name" placeholder="Person Name" value={filter.personName ?? ''} onChange={(e) => { setFilter({ ...filter, personName: e.target.value || undefined }); setPage(0); }} />
        <select aria-label="Filter by type" value={filter.transactionType ?? ''} onChange={(e) => { setFilter({ ...filter, transactionType: (e.target.value || undefined) as TransactionType }); setPage(0); }}>
          <option value="">All Types</option>
          <option value="GIVEN">Given</option>
          <option value="RECEIVED">Received</option>
        </select>
        <select aria-label="Filter by payment mode" value={filter.paymentMode ?? ''} onChange={(e) => { setFilter({ ...filter, paymentMode: e.target.value || undefined }); setPage(0); }}>
          <option value="">All Payment Modes</option>
          {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input type="date" aria-label="From date" title="From date" value={filter.fromDate ?? ''} onChange={(e) => { setFilter({ ...filter, fromDate: e.target.value || undefined }); setPage(0); }} />
        <input type="date" aria-label="To date" title="To date" value={filter.toDate ?? ''} onChange={(e) => { setFilter({ ...filter, toDate: e.target.value || undefined }); setPage(0); }} />
        <input aria-label="Filter by place" placeholder="Place" value={filter.place ?? ''} onChange={(e) => { setFilter({ ...filter, place: e.target.value || undefined }); setPage(0); }} />
      </div>

      <DataTable<MoyTransaction>
        columns={[
          { header: 'Date', render: (t) => t.transactionDate },
          { header: 'Person Name', render: (t) => <Link to={`/person-summary?name=${encodeURIComponent(t.personName)}`}>{t.personName}</Link> },
          { header: 'Type', render: (t) => <span className={`badge badge-${t.transactionType.toLowerCase()}`}>{t.transactionType}</span> },
          { header: 'Amount', render: (t) => <CurrencyDisplay amount={t.amount} />, align: 'right' },
          { header: 'Payment Mode', render: (t) => t.paymentMode },
          { header: 'Place', render: (t) => t.place ?? '—' },
          {
            header: 'Actions',
            render: (t) => (
              <>
                <button className="btn-link" onClick={() => openEdit(t)}>Edit</button>
                <button className="btn-link danger" onClick={() => setToDelete(t)}>Delete</button>
              </>
            ),
          },
        ]}
        rows={rows}
        emptyMessage="No Moy transactions yet — record the first Given or Received amount above."
      />

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {showForm && (
        <Modal title={editing ? 'Edit Moy Transaction' : 'Add Moy Transaction'} onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="form-grid">
            <label>
              Person Name
              <input required maxLength={150} value={form.personName} onChange={(e) => setForm({ ...form, personName: e.target.value })} placeholder="Type a person's name" />
            </label>
            <label>
              Transaction Type
              <select value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value as TransactionType })}>
                <option value="GIVEN">Given</option>
                <option value="RECEIVED">Received</option>
              </select>
            </label>
            <label>Amount (₹)<input required type="number" min="0.01" step="0.01" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></label>
            <label>
              Payment Mode
              <select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value as PaymentMode })}>
                {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label>
              Place
              <input
                value={form.place ?? ''}
                onChange={(e) => setForm({ ...form, place: e.target.value })}
                placeholder="Type an existing or new place"
                list="place-suggestions"
              />
              <datalist id="place-suggestions">
                {placeOptions.map((p) => <option key={p} value={p} />)}
              </datalist>
            </label>
            <label>Date<input required type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} /></label>
            <label className="full-width">Notes<textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
            {formError && <div className="form-error full-width">{formError}</div>}
            <div className="modal-actions full-width">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {showImport && (
        <ExcelImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { load(); loadPlaceOptions(); }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete transaction?"
          message="This transaction will be soft-deleted — it's removed from active views but the historical record is preserved for audit purposes."
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
