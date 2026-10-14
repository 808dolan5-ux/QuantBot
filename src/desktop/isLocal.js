// True inside the QuantBot desktop app, where data, keys and AI calls are handled on this PC
export const IS_LOCAL = typeof window !== 'undefined' && !!window.quantbotLocal;