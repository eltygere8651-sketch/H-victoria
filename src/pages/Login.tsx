import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import * as storageService from '../services/storageService';
import { User, UserRole } from '../types';
import { Loader2, ArrowRight, ShieldCheck, AlertCircle, Plus, Building, Lock, Mail } from 'lucide-react';
import { GuideModal } from '../components/GuideModal';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';

interface LoginProps {
  onLogin: (user: User) => void;
  setShowGuideModal: (show: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, setShowGuideModal }) => {
  const [username, setUsername] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
  // Owner Flow State
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<storageService.Workspace[]>([]);
  const [showWorkspaceSelection, setShowWorkspaceSelection] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceId, setNewWorkspaceId] = useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [ownerUserObj, setOwnerUserObj] = useState<User | null>(null);
  const [workspaceId, setWorkspaceId] = useState('');

  // Owner Auth State
  const [showOwnerAuth, setShowOwnerAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [ownerAuthEmail, setOwnerAuthEmail] = useState('');
  const [ownerAuthPassword, setOwnerAuthPassword] = useState('');
  const [ownerAuthName, setOwnerAuthName] = useState('');

  const [blockedWorkspaceMessage, setBlockedWorkspaceMessage] = useState<string | null>(null);

  const handleOwnerEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleLoading(true);
    setError('');
    try {
      let user;
      if (isSignUp) {
        user = await storageService.signUpWithEmail(ownerAuthEmail, ownerAuthPassword, ownerAuthName || 'Propietario');
      } else {
        user = await storageService.signInWithEmail(ownerAuthEmail, ownerAuthPassword);
      }
      
      if (user && user.email) {
        const ownerUser: User = {
          id: user.uid,
          name: user.displayName || ownerAuthName || 'Propietario',
          role: UserRole.ADMIN,
          contraseña: '****',
          permissions: ['CAN_MANAGE_TASKS'],
          email: user.email
        };
        await loadOwnerWorkspaces(user.email, ownerUser);
      } else {
        setError('Error al procesar el usuario.');
      }
    } catch (err: any) {
      setError('Error: ' + err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!workspaceId.trim()) {
      setError('Debes ingresar el Código del Salón.');
      setLoading(false);
      return;
    }

    setTimeout(async () => {
      try {
        const wsId = workspaceId.trim().toLowerCase();
        const ws = await storageService.getWorkspace(wsId);
        
        if (ws) {
          if (ws.status === 'PENDING') {
            setBlockedWorkspaceMessage('Este salón está pendiente de aprobación. Por favor, espera a que el administrador revise la solicitud de prueba gratuita.');
            setLoading(false);
            return;
          }
          if (ws.status === 'EXPIRED' || (ws.subscriptionEndsAt && ws.subscriptionEndsAt < Date.now())) {
            setBlockedWorkspaceMessage('La suscripción de este salón ha expirado. Por favor, contacta al administrador para renovarla.');
            setLoading(false);
            return;
          }
        }
        
        storageService.setActiveWorkspaceId(wsId, ws?.name);
        
        const user = await storageService.login(username, contraseña);
        if (user) {
          onLogin(user);
        } else {
          setError('Credenciales inválidas o salón incorrecto');
        }
      } catch (err: any) {
        setError('Error: ' + err.message);
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  const loadOwnerWorkspaces = async (email: string, ownerUser: User) => {
    try {
      const isSuperAdmin = email.toLowerCase() === 'eltygere8651@gmail.com';
      const wss = await storageService.getOwnerWorkspaces(email);
      
      // Auto-dev bypass for Super Admin
      if (isSuperAdmin) {
        let devWs = wss.find(w => w.id === 'dev-sandbox');
        if (!devWs) {
          devWs = await storageService.createWorkspace('dev-sandbox', 'Dev Sandbox', email);
        }
        handleSelectWorkspace(devWs, ownerUser);
        return;
      }
      
      if (wss.length === 1) {
         // Auto-select if there's only one workspace for normal owners
         handleSelectWorkspace(wss[0], ownerUser);
         return;
      }

      setWorkspaces(wss);
      setOwnerEmail(email);
      setOwnerUserObj(ownerUser);
      if (wss.length === 0) {
        setNewWorkspaceId(Math.random().toString(36).substring(2, 8).toLowerCase());
      }
      setShowWorkspaceSelection(true);
    } catch (err: any) {
      setError('Error al cargar salones: ' + err.message);
    }
  };

  const handleSelectWorkspace = async (ws: storageService.Workspace, user: User = ownerUserObj!) => {
    if (!user) return;
    
    const isSuperAdmin = user.email?.toLowerCase() === 'eltygere8651@gmail.com';
    if (!isSuperAdmin) {
      if (ws.status === 'PENDING') {
        setBlockedWorkspaceMessage('Este salón está pendiente de aprobación. Por favor, espera a que el administrador revise la solicitud de prueba gratuita.');
        return;
      }
      if (ws.status === 'EXPIRED' || (ws.subscriptionEndsAt && ws.subscriptionEndsAt < Date.now())) {
        setBlockedWorkspaceMessage('La suscripción de este salón ha expirado. Por favor, contacta al administrador para renovarla.');
        return;
      }
    }
    
    storageService.setActiveWorkspaceId(ws.id, ws.name);
    await storageService.initFirestoreWithInitialData();
    storageService.saveSession(user);
    onLogin(user);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName || !newWorkspaceId || !ownerEmail || !ownerUserObj) return;
    
    setIsCreatingWorkspace(true);
    setError('');
    
    try {
      if (!/^[a-z0-9\-]+$/.test(newWorkspaceId)) {
        throw new Error('El código solo puede contener minúsculas, números y guiones.');
      }
      
      const newWs = await storageService.createWorkspace(newWorkspaceId, newWorkspaceName, ownerEmail);
      await handleSelectWorkspace(newWs, ownerUserObj);
    } catch (err: any) {
      setError(err.message);
      setIsCreatingWorkspace(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const user = await storageService.signInWithGoogle();
      if (user && user.email) {
        const ownerUser: User = {
          id: user.uid,
          name: user.displayName || 'Propietario',
          role: UserRole.ADMIN,
          contraseña: '****',
          permissions: ['CAN_MANAGE_TASKS'],
          email: user.email
        };
        await loadOwnerWorkspaces(user.email, ownerUser);
      } else {
        setError('No se pudo obtener el correo de la cuenta.');
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Error al iniciar con Google: ' + err.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  if (blockedWorkspaceMessage) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden transition-colors duration-700">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-400/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-700 transition-all duration-500 animate-pop-in relative z-10 text-center p-8">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="text-red-500" size={32} />
          </div>
          <h2 className="text-2xl font-black text-white mb-4">Acceso Restringido</h2>
          <p className="text-slate-300 font-medium mb-8 leading-relaxed">
            {blockedWorkspaceMessage}
          </p>
          <button 
            onClick={() => setBlockedWorkspaceMessage(null)}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-all border border-slate-700"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden transition-colors duration-700">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-400/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-700 transition-all duration-500 animate-pop-in relative z-10">
        
        <div className="pt-10 pb-6 px-8 flex flex-col items-center justify-center relative">
          <div className="flex flex-col items-center">
            <div className="mb-6 cursor-pointer active:scale-95 transition-transform" onClick={() => setShowGuideModal(true)}>
              <Logo size="lg" strokeColor="#ffffff" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Bienvenido a Hub</h1>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-xs font-medium text-slate-200">
              <ShieldCheck size={14} className="text-emerald-400" /> Acceso Seguro
            </div>
          </div>
        </div>

        <div className="p-8 pt-2">
          {error && (
            <div className="mb-4 bg-red-950/20 text-red-400 p-3 rounded-xl text-sm font-medium text-center animate-shake border border-red-900/30 flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            </div>
          )}

          {!showWorkspaceSelection ? (
            <>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5 group">
                  <label className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1 group-focus-within:text-red-400 transition-colors">Código de Salón</label>
                  <input
                    type="text"
                    value={workspaceId}
                    onChange={(e) => setWorkspaceId(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ''))}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-700 bg-slate-800 text-white placeholder-slate-500 focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold"
                    placeholder="ej. mi-negocio"
                    required
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-1.5 group">
                  <label className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1 group-focus-within:text-red-400 transition-colors">Usuario</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-700 bg-slate-800 text-white placeholder-slate-500 focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold"
                    placeholder="Nombre de usuario"
                    required
                    disabled={loading}
                  />
                </div>
                
                <div className="space-y-1.5 group">
                  <label className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1 group-focus-within:text-red-400 transition-colors">Contraseña Personal</label>
                  <input
                    type="password"
                    value={contraseña}
                    onChange={(e) => setContraseña(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-700 bg-slate-800 text-white placeholder-slate-500 focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 outline-none transition-all tracking-[0.5em] font-black"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md shadow-red-600/20 hover:shadow-red-600/40 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none mt-2"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <><span>Acceder a Salón</span> <ArrowRight size={18} /></>
                  )}
                </button>
              </form>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/50"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                  <span className="bg-slate-900 px-3 text-slate-400">Propietario / Admin</span>
                </div>
              </div>

              <div className="space-y-4">
                {!showOwnerAuth && (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading || googleLoading}
                    className="w-full bg-white hover:bg-slate-50 text-slate-900 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md disabled:opacity-50"
                  >
                    {googleLoading ? <Loader2 className="animate-spin" size={20} /> : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>Continuar con Google</span>
                      </>
                    )}
                  </button>
                )}

                {!showOwnerAuth ? (
                  <>
                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-700/30"></div>
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                        <span className="bg-slate-900 px-3 text-slate-500">o usa tu correo electrónico</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => { setShowOwnerAuth(true); setIsSignUp(false); }}
                        className="w-full bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm text-xs"
                      >
                        <Mail size={16} className="text-slate-400" />
                        <span>Iniciar Sesión</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowOwnerAuth(true); setIsSignUp(true); }}
                        className="w-full bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm text-xs"
                      >
                        <span>Regístrate</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-black text-white uppercase tracking-wider">{isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
                      <button type="button" onClick={() => setShowOwnerAuth(false)} className="text-slate-400 hover:text-white transition-colors">
                        <ArrowRight size={18} className="rotate-180" />
                      </button>
                    </div>
                    <form onSubmit={handleOwnerEmailAuth} className="space-y-3">
                      {isSignUp && (
                        <input
                          type="text"
                          value={ownerAuthName}
                          onChange={(e) => setOwnerAuthName(e.target.value)}
                          placeholder="Nombre completo"
                          className="w-full px-4 py-3.5 rounded-xl border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 focus:bg-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium transition-all"
                          required
                          disabled={googleLoading}
                        />
                      )}
                      <input
                        type="email"
                        value={ownerAuthEmail}
                        onChange={(e) => setOwnerAuthEmail(e.target.value)}
                        placeholder="Correo Electrónico"
                        className="w-full px-4 py-3.5 rounded-xl border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 focus:bg-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium transition-all"
                        required
                        disabled={googleLoading}
                      />
                      <input
                        type="password"
                        value={ownerAuthPassword}
                        onChange={(e) => setOwnerAuthPassword(e.target.value)}
                        placeholder="Contraseña"
                        className="w-full px-4 py-3.5 rounded-xl border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 focus:bg-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium tracking-widest transition-all"
                        required
                        disabled={googleLoading}
                      />
                      <button
                        type="submit"
                        disabled={googleLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-md mt-2"
                      >
                        {googleLoading ? <Loader2 className="animate-spin" size={16} /> : <span>{isSignUp ? 'Completar Registro' : 'Iniciar Sesión'}</span>}
                      </button>
                    </form>
                    
                    <div className="text-center mt-4">
                      <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-[11px] text-slate-400 hover:text-white transition-colors font-medium">
                        {isSignUp ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿No tienes cuenta? Crea una gratis'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-6 animate-pop-in">
              <h2 className="text-xl font-bold text-white text-center">Mis Salones</h2>
              
              {workspaces.length > 0 && (
                <div className="space-y-3">
                  {workspaces.map(ws => (
                    <button
                      key={ws.id}
                      onClick={() => handleSelectWorkspace(ws)}
                      className="w-full flex items-center justify-between p-4 bg-slate-800 border border-slate-700 hover:border-red-500 hover:bg-slate-750 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Building className="text-slate-400" size={20} />
                        <div className="text-left">
                          <p className="font-bold text-white">{ws.name}</p>
                          <p className="text-xs text-slate-400">Código: {ws.id}</p>
                        </div>
                      </div>
                      <ArrowRight className="text-slate-500" size={16} />
                    </button>
                  ))}
                  
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-slate-900 px-2 text-slate-400">O crea uno nuevo</span>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateWorkspace} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-300 uppercase">Nombre del Negocio</label>
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-900 text-white text-sm focus:border-red-500 outline-none"
                    placeholder="Ej. Peluquería Estilos"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-300 uppercase">Código Único (IDs)</label>
                  <input
                    type="text"
                    value={newWorkspaceId}
                    onChange={(e) => setNewWorkspaceId(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ''))}
                    className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-900 text-white text-sm focus:border-red-500 outline-none"
                    placeholder="ej. estilos-123"
                    required
                  />
                  <p className="text-[9px] text-slate-500">Este será el código que usarán tus empleados para entrar.</p>
                </div>
                <button
                  type="submit"
                  disabled={isCreatingWorkspace}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {isCreatingWorkspace ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={16} /> Crear y Acceder</>}
                </button>
              </form>

              <button 
                type="button" 
                onClick={() => setShowWorkspaceSelection(false)}
                className="w-full text-center text-sm text-slate-400 hover:text-white transition-colors"
              >
                ← Volver al login de empleados
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
             <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
               Hub Eco System
             </p>
          </div>
        </div>
      </div>

      <PWAInstallPrompt isOpen={showInstallPrompt} onClose={() => setShowInstallPrompt(false)} />
    </div>
  );
};

export default Login;
