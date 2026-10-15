/**
 * Runs once when the Next.js server starts (nodejs runtime).
 *
 * The hosting platform occasionally resets the environment, which wipes the
 * contents of db/custom.db (the file is git-ignored, so a redeploy or reset
 * can leave the app with zero users). When that happens, we automatically
 * re-seed the full demo dataset so the prototype is always usable — the
 * administration can simply log back in with the demo accounts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  try {
    const { db } = await import('./lib/db')
    const users = await db.user.count()
    if (users === 0) {
      console.log('[auto-seed] Base de données vide détectée — génération des données de démonstration...')
      const { seedAll } = await import('../scripts/seed')
      await seedAll()
      console.log('[auto-seed] Terminé — la plateforme est prête (comptes démo : mot de passe demo1234).')
    }
  } catch (e) {
    console.error('[auto-seed] Échec de la régénération automatique:', e)
  }
}
