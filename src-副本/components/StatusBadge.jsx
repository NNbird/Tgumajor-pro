import React from 'react';
import { CheckCircle, XCircle, Activity } from 'lucide-react';

export default function StatusBadge({ status, reason }) {
  if (status === 'approved') {
    return <span className="flex items-center text-green-400 text-xs font-bold uppercase tracking-wider border border-green-400/30 px-2 py-1 bg-green-400/10 rounded"><CheckCircle size={12} className="mr-1"/> 已过审</span>;
  }
  if (status === 'rejected') {
    return (
      <div className="flex flex-col items-end">
        <span className="flex items-center text-red-500 text-xs font-bold uppercase tracking-wider border border-red-500/30 px-2 py-1 bg-red-500/10 rounded mb-1"><XCircle size={12} className="mr-1"/> 未通过</span>
        {reason && <span className="text-[10px] text-red-400">{reason}</span>}
      </div>
    );
  }
  return <span className="flex items-center text-yellow-500 text-xs font-bold uppercase tracking-wider border border-yellow-500/30 px-2 py-1 bg-yellow-500/10 rounded"><Activity size={12} className="mr-1"/> 审核中</span>;
}