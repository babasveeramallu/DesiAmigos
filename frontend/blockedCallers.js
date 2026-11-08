const STORAGE_KEY = 'safe-signal-blocked-callers';

export function loadBlockedCallers(storage){
  try{
    const raw = (storage ?? localStorage).getItem(STORAGE_KEY);
    if (raw === null) return {callers: [], notice: ''};
    const callers = JSON.parse(raw);
    if (!Array.isArray(callers) || !callers.every(caller => typeof caller === 'string' && caller.length > 0)){
      console.warn('Invalid saved demo block list.');
      return {callers: [], notice: 'The saved demo block list is invalid. Block callers again to replace it.'};
    }
    return {callers: [...new Set(callers)], notice: ''};
  }catch(error){
    if (!(error instanceof DOMException) && !(error instanceof SyntaxError)) throw error;
    console.warn('Demo block list could not be loaded.', error.name);
    return {callers: [], notice: 'The saved demo block list could not be loaded. Blocking is available for this visit.'};
  }
}

export function saveBlockedCallers(callers, storage){
  try{
    (storage ?? localStorage).setItem(STORAGE_KEY, JSON.stringify(callers));
    return '';
  }catch(error){
    if (!(error instanceof DOMException)) throw error;
    console.warn('Demo block list could not be saved.', error.name);
    return 'Block changes apply for this visit, but could not be saved in this browser.';
  }
}
