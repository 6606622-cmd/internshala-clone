import axios from "axios";
import { Lock, User } from "lucide-react";
import { useRouter } from "next/router";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "../../../context/LanguageContext";

const text = {
  en: {
    title: "Admin Login",
    subtitle:
      "Access the admin dashboard to manage internships and applications",
    username: "Username",
    usernamePlaceholder: "Enter your username",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    signingIn: "Signing in...",
    signIn: "Sign in",
    adminOnly: "Admin access only",
    fillAll: "Please fill in all details",
    loginSuccess: "Logged in successfully",
    invalidCredentials: "Invalid username or password",
    serverError: "Unable to connect to server",
  },

  es: {
    title: "Inicio de Sesión de Administrador",
    subtitle:
      "Accede al panel de administración para gestionar pasantías y solicitudes",
    username: "Nombre de usuario",
    usernamePlaceholder: "Ingresa tu nombre de usuario",
    password: "Contraseña",
    passwordPlaceholder: "Ingresa tu contraseña",
    signingIn: "Iniciando sesión...",
    signIn: "Iniciar sesión",
    adminOnly: "Solo acceso de administrador",
    fillAll: "Por favor completa todos los detalles",
    loginSuccess: "Sesión iniciada correctamente",
    invalidCredentials: "Nombre de usuario o contraseña incorrectos",
    serverError: "No se puede conectar con el servidor",
  },

  hi: {
    title: "एडमिन लॉगिन",
    subtitle:
      "इंटर्नशिप और आवेदन प्रबंधित करने के लिए एडमिन डैशबोर्ड तक पहुंचें",
    username: "यूज़रनेम",
    usernamePlaceholder: "अपना यूज़रनेम दर्ज करें",
    password: "पासवर्ड",
    passwordPlaceholder: "अपना पासवर्ड दर्ज करें",
    signingIn: "साइन इन हो रहा है...",
    signIn: "साइन इन करें",
    adminOnly: "केवल एडमिन के लिए",
    fillAll: "कृपया सभी विवरण भरें",
    loginSuccess: "सफलतापूर्वक लॉग इन किया गया",
    invalidCredentials: "यूज़रनेम या पासवर्ड गलत है",
    serverError: "सर्वर से कनेक्ट नहीं हो सका",
  },

  pt: {
    title: "Login do Administrador",
    subtitle:
      "Acesse o painel administrativo para gerenciar estágios e candidaturas",
    username: "Nome de usuário",
    usernamePlaceholder: "Digite seu nome de usuário",
    password: "Senha",
    passwordPlaceholder: "Digite sua senha",
    signingIn: "Entrando...",
    signIn: "Entrar",
    adminOnly: "Apenas acesso de administrador",
    fillAll: "Preencha todos os detalhes",
    loginSuccess: "Login realizado com sucesso",
    invalidCredentials: "Nome de usuário ou senha inválidos",
    serverError: "Não foi possível conectar ao servidor",
  },

  zh: {
    title: "管理员登录",
    subtitle: "访问管理面板以管理实习和申请",
    username: "用户名",
    usernamePlaceholder: "输入您的用户名",
    password: "密码",
    passwordPlaceholder: "输入您的密码",
    signingIn: "正在登录...",
    signIn: "登录",
    adminOnly: "仅限管理员访问",
    fillAll: "请填写所有信息",
    loginSuccess: "登录成功",
    invalidCredentials: "用户名或密码无效",
    serverError: "无法连接到服务器",
  },

  fr: {
    title: "Connexion Administrateur",
    subtitle:
      "Accédez au tableau de bord pour gérer les stages et les candidatures",
    username: "Nom d'utilisateur",
    usernamePlaceholder: "Entrez votre nom d'utilisateur",
    password: "Mot de passe",
    passwordPlaceholder: "Entrez votre mot de passe",
    signingIn: "Connexion...",
    signIn: "Se connecter",
    adminOnly: "Accès réservé à l'administrateur",
    fillAll: "Veuillez remplir tous les détails",
    loginSuccess: "Connexion réussie",
    invalidCredentials: "Nom d'utilisateur ou mot de passe incorrect",
    serverError: "Impossible de se connecter au serveur",
  },
};

const index = () => {
  const { language } = useLanguage();
  const t = text[language] || text.en;

  const [formdata, setformdata] = useState({
    username: "",
    password: "",
  });

  const router = useRouter();
  const [isloading, setisloading] = useState(false);

  const handlechange = (e: any) => {
    const { name, value } = e.target;

    setformdata((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlesubmit = async (e: any) => {
    e.preventDefault();

    if (!formdata.username || !formdata.password) {
      toast.error(t.fillAll);
      return;
    }

    try {
      setisloading(true);

      const res = await axios.post(
        "https://internshala-clone-a0st.onrender.com/api/admin/adminlogin",
        formdata
      );

      console.log("Login response:", res.data);

      toast.success(t.loginSuccess);

      router.push("/adminpanel");
    } catch (error: any) {
      console.log("Login error:", error);
      console.log("Status:", error.response?.status);
      console.log("Response:", error.response?.data);

      if (error.response?.status === 401) {
        toast.error(t.invalidCredentials);
      } else {
        toast.error(t.serverError);
      }
    } finally {
      setisloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          <div className="px-6 sm:px-8 pt-8 pb-6 text-center border-b border-gray-200">

            <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Lock className="h-6 w-6 text-blue-600" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {t.title}
            </h2>

            <p className="mt-2 text-sm text-gray-500 leading-6">
              {t.subtitle}
            </p>

          </div>

          <form
            className="p-6 sm:p-8 space-y-5"
            onSubmit={handlesubmit}
          >

            {/* USERNAME */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {t.username}
              </label>

              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

                <input
                  type="text"
                  required
                  name="username"
                  id="username"
                  value={formdata.username}
                  onChange={handlechange}
                  placeholder={t.usernamePlaceholder}
                  className="w-full h-11 text-sm text-gray-900 pl-10 pr-3 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {t.password}
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

                <input
                  type="password"
                  required
                  id="password"
                  name="password"
                  value={formdata.password}
                  onChange={handlechange}
                  placeholder={t.passwordPlaceholder}
                  className="block w-full h-11 text-sm text-gray-900 pl-10 pr-3 bg-white border border-gray-300 rounded-lg outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isloading}
                className="w-full h-11 border border-transparent flex items-center justify-center px-4 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
              >
                {isloading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    {t.signingIn}
                  </div>
                ) : (
                  t.signIn
                )}
              </button>
            </div>

          </form>
        </div>

        <p className="mt-5 text-center text-xs text-gray-400">
          {t.adminOnly}
        </p>

      </div>
    </div>
  );
};

export default index;