import React, { useState, useEffect } from 'react';
import { openFolder } from '../lib/fileSystem';

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

export const VaultManager: React.FC<{ onOpenVault: (vault: Vault) => void }> = ({ onOpenVault }) => {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const localVaults = getVaultsFromLocalStorage();
    setVaults(localVaults);
    setLoading(false);
  }, []);

  const addVault = async () => {
    try {
      const folder = await openFolder();
      if (!folder) return;
      const name = folder.split(/[\\/]/).pop() || folder;
      const newVault: Vault = { name, path: folder };
      const updated = [...vaults, newVault].filter((v, i, arr) => arr.findIndex(x => x.path === v.path) === i);
      setVaults(updated);
      saveVaultsToLocalStorage(updated);
    } catch (error) {
      console.error('Failed to add vault:', error);
      // Could add a toast/notification here in the future
    }
  };

  const openVault = (vault: Vault) => {
    onOpenVault(vault);
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
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {vaults.length === 0 && <div className="py-8 text-center text-gray-500 dark:text-gray-400">No vaults found.</div>}
          {vaults.map((vault, idx) => (
            <div key={vault.path} className="flex items-center justify-between py-4">
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{vault.name}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">{vault.path}</div>
              </div>
              <button
                className="ml-4 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => openVault(vault)}
              >
                Open
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
