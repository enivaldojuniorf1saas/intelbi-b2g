"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, User as UserIcon, AlertCircle, CheckCircle2, Camera, Shield } from "lucide-react";
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

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newAvatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase.from('usuarios').update({ avatar_url: newAvatarUrl }).eq('id', user.id);
      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      showFeedback('success', 'Avatar atualizado com sucesso!');
      
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
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      
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
    <div className="min-h-screen w-full bg-[#f8fafc] p-4 lg:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6 mt-2">
        
        {/* CABEÇALHO */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações da Conta</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie suas informações de perfil e segurança.</p>
        </div>

        {/* FEEDBACK GLOBAL */}
        {feedback.type && (
          <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm ${
            feedback.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            {feedback.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            <p className="text-sm font-semibold">{feedback.msg}</p>
          </div>
        )}

        {/* CARD PRINCIPAL UNIFICADO */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* BANNER DEGRADÊ TOPO */}
          <div className="h-32 w-full bg-gradient-to-r from-blue-100 via-indigo-50 to-blue-50"></div>

          <div className="px-6 sm:px-10 pb-10">
            
            {/* AVATAR E INFO PRINCIPAL */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-12 mb-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
                
                <div className="relative group">
                  <div className="h-24 w-24 rounded-full border-4 border-white bg-slate-100 overflow-hidden shadow-sm flex items-center justify-center">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="Avatar" width={96} height={96} className="object-cover h-full w-full" />
                    ) : (
                      <UserIcon className="h-10 w-10 text-slate-400" />
                    )}
                  </div>
                  
                  {/* Input de arquivo escondido */}
                  <Input type="file" accept="image/png, image/jpeg, image/jpg" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                </div>
                
                <div className="mb-2 text-center sm:text-left">
                  <h2 className="text-xl font-bold text-slate-900">{profile?.nome || "Seu Nome"}</h2>
                  <p className="text-sm text-slate-500 font-medium">{user?.email || "seu@email.com"}</p>
                </div>

              </div>

              {/* BOTÕES DE AÇÃO DO AVATAR */}
              <div className="mb-2 flex items-center justify-center gap-3">
                {avatarFile ? (
                  <Button onClick={handleUploadAvatar} disabled={loadingAvatar} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9">
                    {loadingAvatar ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Salvar Foto
                  </Button>
                ) : (
                  <Button onClick={() => fileInputRef.current?.click()} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9">
                    <Camera className="h-4 w-4 mr-2" />
                    Alterar Foto
                  </Button>
                )}
                
                {avatarUrl && !avatarFile && (
                  <button onClick={handleRemoveAvatar} disabled={loadingAvatar} className="text-xs font-semibold text-rose-500 hover:text-rose-700 hover:underline">
                    Remover
                  </button>
                )}
                {avatarFile && (
                  <button onClick={() => setAvatarFile(null)} disabled={loadingAvatar} className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline">
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            <hr className="border-slate-100 mb-8" />

            {/* GRID DO FORMULÁRIO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* CAMPO NOME */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700">Nome Completo</label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} className="bg-slate-50 border-slate-200 h-11 text-slate-800 font-medium" />
                <div className="flex justify-end">
                  <Button onClick={handleUpdateNome} disabled={loadingNome || !nome || nome === profile?.nome} size="sm" className="bg-slate-800 hover:bg-slate-900 text-white font-bold">
                    {loadingNome ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Salvar Nome
                  </Button>
                </div>
              </div>

              {/* CAMPO E-MAIL */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700">Endereço de E-mail</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-slate-50 border-slate-200 h-11 text-slate-800 font-medium" />
                <div className="flex justify-end">
                  <Button onClick={handleUpdateEmail} disabled={loadingEmail || !email || email === user?.email} size="sm" className="bg-slate-800 hover:bg-slate-900 text-white font-bold">
                    {loadingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Alterar E-mail
                  </Button>
                </div>
              </div>

              {/* BLOCO DE SEGURANÇA (SENHA) OCUPANDO 2 COLUNAS */}
              <div className="col-span-1 md:col-span-2 pt-6 mt-2 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-6">
                  <Shield className="h-4 w-4 text-blue-600" />
                  Segurança e Autenticação
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-700">Nova Senha</label>
                    <Input type="password" placeholder="Mínimo 6 caracteres" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} className="bg-slate-50 border-slate-200 h-11" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-700">Confirmar Nova Senha</label>
                    <Input type="password" placeholder="Repita a senha" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} className="bg-slate-50 border-slate-200 h-11" />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleUpdateSenha} disabled={loadingSenha || !novaSenha || !confirmarSenha} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6">
                    {loadingSenha ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Atualizar Senha
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}