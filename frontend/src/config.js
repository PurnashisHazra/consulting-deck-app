// Central runtime configuration for feature toggles.
// ENABLE_INLINE_EDITING can be controlled via environment variable REACT_APP_ENABLE_INLINE_EDITING.
const parseBoolean = (v) => {
  if (v === undefined || v === null) return true; // default: enabled
  const s = String(v).toLowerCase().trim();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
};

export const ENABLE_INLINE_EDITING = parseBoolean(process.env.REACT_APP_ENABLE_INLINE_EDITING);

export default {
  ENABLE_INLINE_EDITING,
};
