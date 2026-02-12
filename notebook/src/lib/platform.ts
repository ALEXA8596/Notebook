
const IS_MAC = /Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent);

export const isMac = (): boolean => IS_MAC;

export const getModifierKey = (): string => IS_MAC ? '⌘' : 'Ctrl';

export const getModifierKeyLabel = (key: string): string => {
    if (key === 'Mod') return getModifierKey();
    if (key === 'Cmd') return getModifierKey();
    if (key === 'Ctrl') return 'Ctrl';
    return key;
}
