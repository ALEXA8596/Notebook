import React, { useState, useEffect } from 'react';
import { openVault } from '../lib/fileSystem';

export interface Vault {
  name: string;
  path: string;
}

function getVaultsFromLocalStorage(): Vault[] {
  try {
    const raw = localStorage.getItem('vaults');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveVaultsToLocalStorage(vaults: Vault[]) {
  localStorage.setItem('vaults', JSON.stringify(vaults));
}

export const VaultManager: React.FC<{ onOpenVault: (vault: Vault) => void | Promise<void> }> = ({ onOpenVault }) => {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoOpenNewVault, setAutoOpenNewVault] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('vault-manager-settings');
      if (raw) return JSON.parse(raw).autoOpenNewVault !== false;
    } catch {}
    return true;
  });
  const [status, setStatus] = useState<{ currentVaultPath: string | null; approvedVaults: string[] }>({
    currentVaultPath: null,
    approvedVaults: [],
  });

  const refreshStatus = async () => {
    if (window.electronAPI?.vault?.getStatus) {
      const next = await window.electronAPI.vault.getStatus();
      setStatus(next);
    }
  };

  const persistSettings = (next: boolean) => {
    setAutoOpenNewVault(next);
    try {
      localStorage.setItem('vault-manager-settings', JSON.stringify({ autoOpenNewVault: next }));
    } catch {}
  };

  useEffect(() => {
    const localVaults = getVaultsFromLocalStorage();
    setVaults(localVaults);
    setLoading(false);
    refreshStatus();
  }, []);

  const addVault = async () => {
    try {
      if (!window.electronAPI?.openVault) {
        alert('Vault picker is unavailable. Please restart the app.');
        return;
      }
      const folder = await openVault();
      if (!folder) return;
      const name = folder.split(/[\\/]/).pop() || folder;
      const newVault: Vault = { name, path: folder };
      const updated = [...vaults, newVault].filter((v, i, arr) => arr.findIndex(x => x.path === v.path) === i);
      setVaults(updated);
      saveVaultsToLocalStorage(updated);
      if (autoOpenNewVault) {
        await onOpenVault(newVault);
      } else {
        await refreshStatus();
      }
    } catch (error) {
      console.error('Failed to add vault:', error);
      alert('Failed to add vault. Please try again.');
    }
  };

  const openVaultEntry = async (vault: Vault) => {
    await onOpenVault(vault);
    await refreshStatus();
  };

  const handleRemoveVault = (vault: Vault) => {
    const updated = vaults.filter(v => v.path !== vault.path);
    setVaults(updated);
    saveVaultsToLocalStorage(updated);
  };

  const handleReapprove = async (vault: Vault) => {
    const folder = await openVault();
    if (!folder) return;
    const normalized = folder;
    if (normalized !== vault.path) {
      const ok = confirm('This path differs from the original vault. Replace the saved path?');
      if (!ok) return;
    }
    const name = normalized.split(/[\\/]/).pop() || normalized;
    const updatedVault: Vault = { name, path: normalized };
    const updated = vaults.map(v => (v.path === vault.path ? updatedVault : v));
    setVaults(updated);
    saveVaultsToLocalStorage(updated);
    await onOpenVault(updatedVault);
    await refreshStatus();
  };

  if (loading) return <div className="p-8 text-gray-500">Loading vaults...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded shadow p-8">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">Vault Manager</h2>
        <button
          className="w-full mb-4 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={addVault}
        >
          Create or Add Vault
        </button>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
          <input
            type="checkbox"
            checked={autoOpenNewVault}
            onChange={(e) => persistSettings(e.target.checked)}
          />
          Auto-open newly added vaults
        </label>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {vaults.length === 0 && <div className="py-8 text-center text-gray-500 dark:text-gray-400">No vaults found.</div>}
          {vaults.map((vault, idx) => (
            <div key={vault.path} className="flex items-center justify-between py-4">
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{vault.name}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">{vault.path}</div>
                <div className="mt-1 text-xs">
                  {status.currentVaultPath === vault.path && (
                    <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Active</span>
                  )}
                  {status.approvedVaults.includes(vault.path) && status.currentVaultPath !== vault.path && (
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Approved</span>
                  )}
                  {!status.approvedVaults.includes(vault.path) && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Needs approval</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!status.approvedVaults.includes(vault.path) ? (
                  <button
                    className="px-3 py-1 bg-amber-500 text-white rounded hover:bg-amber-600"
                    onClick={() => handleReapprove(vault)}
                  >
                    Re-approve
                  </button>
                ) : (
                  <button
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    onClick={() => openVaultEntry(vault)}
                  >
                    Open
                  </button>
                )}
                <button
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
                  onClick={() => handleRemoveVault(vault)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
