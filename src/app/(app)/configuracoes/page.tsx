"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, User as UserIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";

export default function ConfiguracoesPage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  // Estados dos formulários
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Loading e Feedback
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [loadingNome, setLoadingNome] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingSenha, setLoadingSenha] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: "" });

  useEffect(() => {
    if (profile) {
      setNome(profile.nome || "");
      setAvatarUrl(profile.avatar_url || null);
    }
    if (user) {
      setEmail(user.email || "");
    }
  }, [profile, user]);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback({ type: null, msg: "" }), 5000);
  };

  // ==========================================
  // ✨ LÓGICA DE AVATAR
  // ==========================================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !user) return;
    setLoadingAvatar(true);
    
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload para o Storage do Supabase (Requer um bucket chamado 'avatars')
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newAvatarUrl = publicUrlData.publicUrl;

      // Atualiza o perfil na tabela usuarios
      const { error: updateError } = await supabase.from('usuarios').update({ avatar_url: newAvatarUrl }).eq('id', user.id);
      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      showFeedback('success', 'Avatar atualizado com sucesso!');
      
      // O ideal é dar um reload na página para atualizar a foto do sidebar também
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      showFeedback('error', 'Erro ao enviar avatar: ' + error.message);
    } finally {
      setLoadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setLoadingAvatar(true);
    try {
      const { error } = await supabase.from('usuarios').update({ avatar_url: null }).eq('id', user.id);
      if (error) throw error;
      
      setAvatarUrl(null);
      showFeedback('success', 'Avatar removido.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      showFeedback('error', 'Erro ao remover avatar: ' + error.message);
    } finally {
      setLoadingAvatar(false);
    }
  };

  // ==========================================
  // ✨ LÓGICA DE NOME
  // ==========================================
  const handleUpdateNome = async () => {
    if (!nome.trim() || !user) return;
    setLoadingNome(true);
    try {
      const { error } = await supabase.from('usuarios').update({ nome }).eq('id', user.id);
      if (error) throw error;
      showFeedback('success', 'Nome atualizado com sucesso!');
    } catch (error: any) {
      showFeedback('error', 'Erro ao atualizar nome: ' + error.message);
    } finally {
      setLoadingNome(false);
    }
  };

  // ==========================================
  // ✨ LÓGICA DE E-MAIL
  // ==========================================
  const handleUpdateEmail = async () => {
    if (!email.trim() || !user) return;
    setLoadingEmail(true);
    try {
      // A atualização de e-mail no Supabase Auth envia um link de confirmação
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      
      // Atualiza também na tabela de perfis para manter sincronizado
      await supabase.from('usuarios').update({ email }).eq('id', user.id);
      
      showFeedback('success', 'E-mail atualizado! Verifique sua caixa de entrada para confirmar a alteração.');
    } catch (error: any) {
      showFeedback('error', 'Erro ao atualizar e-mail: ' + error.message);
    } finally {
      setLoadingEmail(false);
    }
  };

  // ==========================================
  // ✨ LÓGICA DE SENHA
  // ==========================================
  const handleUpdateSenha = async () => {
    if (!novaSenha || novaSenha !== confirmarSenha) {
      showFeedback('error', 'As senhas não coincidem ou estão vazias.');
      return;
    }
    if (novaSenha.length < 6) {
      showFeedback('error', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    
    setLoadingSenha(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      
      setNovaSenha("");
      setConfirmarSenha("");
      showFeedback('success', 'Senha atualizada com sucesso!');
    } catch (error: any) {
      showFeedback('error', 'Erro ao atualizar senha: ' + error.message);
    } finally {
      setLoadingSenha(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] p-6 lg:p-10 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações da Conta</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie suas informações de perfil e segurança.</p>
        </div>

        {/* FEEDBACK GLOBAL */}
        {feedback.type && (
          <div className={`p-4 rounded-lg flex items-center gap-3 border ${
            feedback.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            {feedback.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            <p className="text-sm font-semibold">{feedback.msg}</p>
          </div>
        )}

        {/* CARD 1: AVATAR */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Avatar</h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Avatar" width={80} height={80} className="object-cover h-full w-full" />
              ) : (
                <UserIcon className="h-8 w-8 text-slate-400" />
              )}
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <Input 
                  type="file" 
                  accept="image/png, image/jpeg, image/jpg"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="bg-slate-50 border-slate-200 text-sm cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <Button 
                  onClick={handleUploadAvatar} 
                  disabled={!avatarFile || loadingAvatar}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold shrink-0"
                >
                  {loadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
              <button 
                onClick={handleRemoveAvatar}
                disabled={!avatarUrl || loadingAvatar}
                className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:underline disabled:opacity-50"
              >
                Remover avatar
              </button>
            </div>
          </div>
        </div>

        {/* CARD 2: NOME */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Alterar nome</h3>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome</label>
            <Input 
              value={nome} 
              onChange={(e) => setNome(e.target.value)} 
              className="bg-slate-50 border-slate-200 h-11" 
            />
          </div>
          <Button 
            onClick={handleUpdateNome} 
            disabled={loadingNome || !nome || nome === profile?.nome}
            className="bg-[#0f172a] hover:bg-slate-800 text-white font-bold h-10 px-6"
          >
            {loadingNome ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar nome
          </Button>
        </div>

        {/* CARD 3: E-MAIL */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Alterar e-mail</h3>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">E-mail</label>
            <Input 
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="bg-slate-50 border-slate-200 h-11" 
            />
          </div>
          <Button 
            onClick={handleUpdateEmail} 
            disabled={loadingEmail || !email || email === user?.email}
            className="bg-[#0f172a] hover:bg-slate-800 text-white font-bold h-10 px-6"
          >
            {loadingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Alterar e-mail
          </Button>
        </div>

        {/* CARD 4: SENHA */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Alterar senha</h3>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nova senha</label>
              <Input 
                type="password"
                value={novaSenha} 
                onChange={(e) => setNovaSenha(e.target.value)} 
                className="bg-slate-50 border-slate-200 h-11" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirmar nova senha</label>
              <Input 
                type="password"
                value={confirmarSenha} 
                onChange={(e) => setConfirmarSenha(e.target.value)} 
                className="bg-slate-50 border-slate-200 h-11" 
              />
            </div>
          </div>

          <Button 
            onClick={handleUpdateSenha} 
            disabled={loadingSenha || !novaSenha || !confirmarSenha}
            className="bg-[#0f172a] hover:bg-slate-800 text-white font-bold h-10 px-6"
          >
            {loadingSenha ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Alterar senha
          </Button>
        </div>

      </div>
    </div>
  );
}