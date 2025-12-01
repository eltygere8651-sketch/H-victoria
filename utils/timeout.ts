/**
 * Wraps a promise with a timeout. If the promise does not resolve or reject
 * within the specified duration, it will be rejected with a timeout error.
 * @param {Promise<T>} promise The promise to wrap.
 * @param {number} ms The timeout duration in milliseconds.
 * @returns {Promise<T>} A new promise that will either resolve with the original
 * promise's value or reject with a timeout error.
 */
export const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      // This new, more explicit error message guides the user to the most likely solution.
      const detailedError = `Error de Timeout (${ms / 1000}s): La subida del archivo falló.

CAUSA MÁS COMÚN: Las reglas de seguridad de Firebase Storage no están configuradas correctamente.

SOLUCIÓN:
1. Ve a tu consola de Firebase.
2. Entra en la sección 'Storage'.
3. Ve a la pestaña 'Reglas' (Rules).
4. Permite la escritura para usuarios autenticados.`;
      reject(new Error(detailedError));
    }, ms);

    promise.then(
      (res) => {
        clearTimeout(timeoutId);
        resolve(res);
      },
      (err) => {
        clearTimeout(timeoutId);
        reject(err);
      }
    );
  });
};