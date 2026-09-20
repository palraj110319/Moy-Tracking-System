import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPersonReport } from '../api/reportApi';
import type { MoyTransaction, PersonRelationshipSummary } from '../types/domain';
import { getPersonHistory, getPersonSummary } from '../api/moyApi';
import { DataTable } from '../components/DataTable';
import { Pagination } from '../components/Pagination';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { useToast } from '../components/Toast';

const STATUS_LABEL: Record<PersonRelationshipSummary['status'], string> = {
  GIVEN_MORE: 'I have given more than I\u2019ve received',
  RECEIVED_MORE: 'I have received more than I\u2019ve given',
  BALANCED: 'Balanced',
  NO_TRANSACTIONS: 'No transactions yet',
};

export function PersonSummary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const personName = searchParams.get('name') ?? '';
  const [summary, setSummary] = useState<PersonRelationshipSummary | null>(null);
  const [history, setHistory] = useState<MoyTransaction[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [names, setNames] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const { notify } = useToast();

  useEffect(() => {
    getPersonReport().then((rows) => setNames(rows.map((r) => r.personName))).catch(() => setNames([]));
  }, []);

  // Reset to the first page when switching person.
  useEffect(() => { setPage(0); }, [personName]);

  const openPerson = (e: React.FormEvent) => {
    e.preventDefault();
    const name = query.trim();
    if (name) setSearchParams({ name });
  };

  const picker = (
    <form className="person-picker" onSubmit={openPerson}>
      <input
        list="person-names"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type or pick a person's name"
        aria-label="Person name"
      />
      <datalist id="person-names">
        {names.map((n) => <option key={n} value={n} />)}
      </datalist>
      <button className="btn btn-primary" type="submit">View summary</button>
    </form>
  );

  useEffect(() => {
    if (!personName) return;
    getPersonSummary(personName).then(setSummary).catch(() => notify('Failed to load summary', 'error'));
  }, [personName]);

  useEffect(() => {
    if (!personName) return;
    getPersonHistory(personName, page)
      .then((p) => { setHistory(p.content); setTotalPages(p.totalPages); })
      .catch(() => notify('Failed to load history', 'error'));
  }, [personName, page]);

  if (!personName) {
    return (
      <div>
        <div className="page-header"><h2>Person Summary</h2></div>
        {picker}
        <div className="empty-state">Choose a person above, or open one from the Person Name link on the Moy Transactions page.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Person Summary: {personName}</h2>
      </div>
      {picker}

      {summary && (
        <div className="summary-cards">
          <div className="card summary-card">
            <div className="summary-label">My Given Amount</div>
            <div className="summary-value"><CurrencyDisplay amount={summary.totalGiven} /></div>
          </div>
          <div className="card summary-card">
            <div className="summary-label">My Received Amount</div>
            <div className="summary-value"><CurrencyDisplay amount={summary.totalReceived} /></div>
          </div>
          <div className="card summary-card">
            <div className="summary-label">Net Difference</div>
            <div className="summary-value"><CurrencyDisplay amount={summary.difference} /></div>
          </div>
          <div className="card summary-card">
            <div className="summary-label">Status</div>
            <div className="summary-value status-text">{STATUS_LABEL[summary.status]}</div>
          </div>
        </div>
      )}

      {summary?.reciprocalTransactionsObserved && (
        <div className="info-banner">
          Both Given and Received transactions exist with this person. This does not automatically mean any
          specific transaction was a "return" — check the notes on individual transactions below for details.
        </div>
      )}

      <div className="card">
        <h3>Transaction History</h3>
        <DataTable<MoyTransaction>
          columns={[
            { header: 'Date', render: (t) => t.transactionDate },
            { header: 'Place', render: (t) => t.place ?? '—' },
            { header: 'Type', render: (t) => <span className={`badge badge-${t.transactionType.toLowerCase()}`}>{t.transactionType}</span> },
            { header: 'Amount', render: (t) => <CurrencyDisplay amount={t.amount} />, align: 'right' },
            { header: 'Payment Mode', render: (t) => t.paymentMode },
            { header: 'Notes', render: (t) => t.notes ?? '—' },
          ]}
          rows={history}
          emptyMessage="No transactions recorded with this person yet."
        />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
