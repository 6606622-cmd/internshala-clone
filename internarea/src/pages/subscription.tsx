
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Script from "next/script";
import {
    auth,
} from "@/firebase/firebase";
import {
    ArrowLeft,
    Check,
    Crown,
    CreditCard,
    RefreshCw,
    ShieldCheck,
    CalendarDays,
    XCircle,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { useLanguage } from "../../context/LanguageContext";

const API_BASE = "https://internshala-clone-a0st.onrender.com/api";

type PlanName = "free" | "bronze" | "silver" | "gold";

interface Subscription {
    plan: PlanName;
    status: string;
    monthlyLimit: number;
    applicationsUsed: number;
    remainingApplications: number;
    quotaMonth: string;
    startedAt: string | null;
    expiresAt: string | null;
    cancelAtPeriodEnd: boolean;
    pendingPlan: PlanName | null;
}

interface PaymentRecord {
    _id: string;
    plan: PlanName;
    amount: number;
    currency: string;
    status: string;
    razorpayPaymentId?: string;
    invoiceNumber?: string;
    paidAt?: string;
    validFrom?: string;
    validUntil?: string;
    createdAt: string;
}

declare global {
    interface Window {
        Razorpay?: new (options: any) => {
            open: () => void;
            on: (
                event: string,
                callback: (response: any) => void
            ) => void;
        };
    }
}

const plans = [
    {
        id: "free" as PlanName,
        name: "Free",
        price: 0,
        limit: "1 application/month",
        description: "Get started with internship applications.",
        features: [
            "1 internship application per month",
            "Basic profile access",
            "Application tracking",
        ],
    },
    {
        id: "bronze" as PlanName,
        name: "Bronze",
        price: 100,
        limit: "3 applications/month",
        description: "For students starting their internship journey.",
        features: [
            "3 internship applications per month",
            "Application tracking",
            "Monthly quota reset",
        ],
    },
    {
        id: "silver" as PlanName,
        name: "Silver",
        price: 300,
        limit: "5 applications/month",
        description: "For students applying to more opportunities.",
        features: [
            "5 internship applications per month",
            "Application tracking",
            "Monthly quota reset",
        ],
    },
    {
        id: "gold" as PlanName,
        name: "Gold",
        price: 1000,
        limit: "Unlimited applications",
        description: "For students who want maximum flexibility.",
        features: [
            "Unlimited internship applications",
            "Application tracking",
            "No monthly application limit",
        ],
    },
];

const formatDate = (
    date: string | null | undefined,
    language: string
) => {
    if (!date) return "Not available";

    const locale =
        language === "zh" ? "zh-CN" :
        language === "hi" ? "hi-IN" :
        language;

    return new Date(date).toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};


const subscriptionTranslations = {
    en: {
        back: "Back to Profile",
        heading: "Subscription Plans",
        subtitle: "Choose a plan that matches your internship application needs.",
        current: "YOUR CURRENT PLAN",
        used: "Applications used",
        remaining: "Applications remaining",
        monthly: "Monthly application limit",
        started: "Started",
        expiry: "Renewal/expiry",
        scheduled: "Your subscription is scheduled to cancel on",
        cancel: "Cancel at period end",
        processing: "Processing...",
        choose: "Choose Your Plan",
        currentPlan: "Current Plan",
        freePlan: "Free Plan",
        choosePlan: "Choose",
        loading: "Loading subscription details...",
        history: "Payment History & Invoices",
        noPayments: "No subscription payments found.",
        plan: "Plan",
        amount: "Amount",
        date: "Date",
        transaction: "Transaction ID",
        invoice: "Invoice",
        status: "Status",
        download: "Download Invoice",
        downloading: "Downloading...",
        paymentInfo: "Payments are processed securely through Razorpay. Subscription purchases are available only between 5:00 AM and 11:45 AM IST. Your subscription activates only after successful server-side payment verification.",
        unlimited: "Unlimited",
        unavailable: "Not available",
        onlyDraft: "Only draft resumes can currently be edited.",
        signIn: "Please sign in to view your subscription.",
        sessionMissing: "Your login session is missing. Please sign in again.",
        paymentLoading: "Payment service is still loading. Please try again.",
        emailMissing: "Your account email is unavailable.",
        verifying: "Verifying your payment. Please wait...",
        paymentSuccess: "Payment successful! Your subscription is now active.",
        verificationFailed: "Payment verification failed.",
        verificationError: "Payment verification could not be completed. Keep your payment ID for support.",
        paymentClosed: "Payment window closed. No subscription was activated.",
        paymentFailed: "Payment failed. Please try again.",
        paymentStartError: "Unable to start payment.",
        cancelConfirm: "Schedule cancellation at the end of your current billing period? Your paid plan will remain active until its expiry date.",
        cancelError: "Unable to cancel subscription.",
        invoiceError: "Unable to download invoice. Please try again.",
        invoiceUnavailable: "Invoice is not available for this payment.",
        loadError: "Unable to load subscription information.",
        razorpayError: "Unable to load Razorpay checkout.",
        plans: {
            free: {
                name: "Free",
                limit: "1 application/month",
                description: "Get started with internship applications.",
                features: ["1 internship application per month", "Basic profile access", "Application tracking"],
            },
            bronze: {
                name: "Bronze",
                limit: "3 applications/month",
                description: "For students starting their internship journey.",
                features: ["3 internship applications per month", "Application tracking", "Monthly quota reset"],
            },
            silver: {
                name: "Silver",
                limit: "5 applications/month",
                description: "For students applying to more opportunities.",
                features: ["5 internship applications per month", "Application tracking", "Monthly quota reset"],
            },
            gold: {
                name: "Gold",
                limit: "Unlimited applications",
                description: "For students who want maximum flexibility.",
                features: ["Unlimited internship applications", "Application tracking", "No monthly application limit"],
            },
        },
    },

    es: {
        back: "Volver al perfil",
        heading: "Planes de suscripción",
        subtitle: "Elige un plan según tus necesidades de solicitudes de prácticas.",
        current: "TU PLAN ACTUAL",
        used: "Solicitudes utilizadas",
        remaining: "Solicitudes restantes",
        monthly: "Límite mensual de solicitudes",
        started: "Inicio",
        expiry: "Renovación/vencimiento",
        scheduled: "Tu suscripción se cancelará el",
        cancel: "Cancelar al final del período",
        processing: "Procesando...",
        choose: "Elige tu plan",
        currentPlan: "Plan actual",
        freePlan: "Plan gratuito",
        choosePlan: "Elegir",
        loading: "Cargando los detalles de la suscripción...",
        history: "Historial de pagos y facturas",
        noPayments: "No se encontraron pagos de suscripción.",
        plan: "Plan",
        amount: "Importe",
        date: "Fecha",
        transaction: "ID de transacción",
        invoice: "Factura",
        status: "Estado",
        download: "Descargar factura",
        downloading: "Descargando...",
        paymentInfo: "Los pagos se procesan de forma segura mediante Razorpay. Las compras de suscripciones están disponibles únicamente entre las 5:00 y las 11:45 IST. La suscripción se activa después de la verificación del pago en el servidor.",
        unlimited: "Ilimitado",
        unavailable: "No disponible",
        signIn: "Inicia sesión para ver tu suscripción.",
        sessionMissing: "Falta tu sesión. Inicia sesión de nuevo.",
        paymentLoading: "El servicio de pago todavía se está cargando. Inténtalo de nuevo.",
        emailMissing: "No se encuentra el correo electrónico de tu cuenta.",
        verifying: "Verificando tu pago. Espera...",
        paymentSuccess: "¡Pago realizado! Tu suscripción ya está activa.",
        verificationFailed: "La verificación del pago ha fallado.",
        verificationError: "No se pudo completar la verificación. Guarda tu ID de pago para recibir ayuda.",
        paymentClosed: "Se cerró la ventana de pago. No se activó ninguna suscripción.",
        paymentFailed: "El pago ha fallado. Inténtalo de nuevo.",
        paymentStartError: "No se pudo iniciar el pago.",
        cancelConfirm: "¿Programar la cancelación al final del período actual? Tu plan seguirá activo hasta su vencimiento.",
        cancelError: "No se pudo cancelar la suscripción.",
        invoiceError: "No se pudo descargar la factura. Inténtalo de nuevo.",
        invoiceUnavailable: "La factura no está disponible para este pago.",
        loadError: "No se pudo cargar la información de la suscripción.",
        razorpayError: "No se pudo cargar el sistema de pago Razorpay.",
        plans: {
            free: { name: "Gratis", limit: "1 solicitud/mes", description: "Comienza a solicitar prácticas.", features: ["1 solicitud de prácticas al mes", "Acceso básico al perfil", "Seguimiento de solicitudes"] },
            bronze: { name: "Bronce", limit: "3 solicitudes/mes", description: "Para estudiantes que comienzan su trayectoria.", features: ["3 solicitudes de prácticas al mes", "Seguimiento de solicitudes", "Restablecimiento mensual del límite"] },
            silver: { name: "Plata", limit: "5 solicitudes/mes", description: "Para estudiantes que buscan más oportunidades.", features: ["5 solicitudes de prácticas al mes", "Seguimiento de solicitudes", "Restablecimiento mensual del límite"] },
            gold: { name: "Oro", limit: "Solicitudes ilimitadas", description: "Para estudiantes que desean máxima flexibilidad.", features: ["Solicitudes ilimitadas", "Seguimiento de solicitudes", "Sin límite mensual de solicitudes"] },
        },
    },

    hi: {
        back: "प्रोफ़ाइल पर वापस जाएँ",
        heading: "सब्सक्रिप्शन प्लान",
        subtitle: "अपनी इंटर्नशिप आवेदन आवश्यकताओं के अनुसार प्लान चुनें।",
        current: "आपका वर्तमान प्लान",
        used: "उपयोग किए गए आवेदन",
        remaining: "शेष आवेदन",
        monthly: "मासिक आवेदन सीमा",
        started: "शुरू हुआ",
        expiry: "नवीनीकरण/समाप्ति",
        scheduled: "आपका सब्सक्रिप्शन इस तारीख को रद्द होगा:",
        cancel: "अवधि के अंत में रद्द करें",
        processing: "प्रक्रिया जारी है...",
        choose: "अपना प्लान चुनें",
        currentPlan: "वर्तमान प्लान",
        freePlan: "मुफ़्त प्लान",
        choosePlan: "चुनें",
        loading: "सब्सक्रिप्शन विवरण लोड हो रहा है...",
        history: "भुगतान इतिहास और इनवॉइस",
        noPayments: "कोई सब्सक्रिप्शन भुगतान नहीं मिला।",
        plan: "प्लान",
        amount: "राशि",
        date: "तारीख",
        transaction: "लेनदेन आईडी",
        invoice: "इनवॉइस",
        status: "स्थिति",
        download: "इनवॉइस डाउनलोड करें",
        downloading: "डाउनलोड हो रहा है...",
        paymentInfo: "भुगतान Razorpay के माध्यम से सुरक्षित रूप से किए जाते हैं। सब्सक्रिप्शन खरीदने का समय सुबह 5:00 से 11:45 IST तक है। सर्वर पर भुगतान सत्यापन सफल होने के बाद ही सब्सक्रिप्शन सक्रिय होता है।",
        unlimited: "असीमित",
        unavailable: "उपलब्ध नहीं",
        signIn: "अपना सब्सक्रिप्शन देखने के लिए साइन इन करें।",
        sessionMissing: "आपका लॉगिन सत्र उपलब्ध नहीं है। कृपया दोबारा साइन इन करें।",
        paymentLoading: "भुगतान सेवा लोड हो रही है। कृपया फिर कोशिश करें।",
        emailMissing: "आपके खाते का ईमेल उपलब्ध नहीं है।",
        verifying: "भुगतान सत्यापित हो रहा है। कृपया प्रतीक्षा करें...",
        paymentSuccess: "भुगतान सफल! आपका सब्सक्रिप्शन सक्रिय हो गया है।",
        verificationFailed: "भुगतान सत्यापन विफल हुआ।",
        verificationError: "भुगतान सत्यापन पूरा नहीं हो सका। सहायता के लिए अपनी पेमेंट आईडी सुरक्षित रखें।",
        paymentClosed: "भुगतान विंडो बंद हो गई। कोई सब्सक्रिप्शन सक्रिय नहीं हुआ।",
        paymentFailed: "भुगतान विफल हुआ। कृपया फिर कोशिश करें।",
        paymentStartError: "भुगतान शुरू नहीं हो सका।",
        cancelConfirm: "क्या आप वर्तमान बिलिंग अवधि के अंत में रद्द करना चाहते हैं? आपका भुगतान किया गया प्लान समाप्ति तक सक्रिय रहेगा।",
        cancelError: "सब्सक्रिप्शन रद्द नहीं हो सका।",
        invoiceError: "इनवॉइस डाउनलोड नहीं हो सका। कृपया फिर कोशिश करें।",
        invoiceUnavailable: "इस भुगतान के लिए इनवॉइस उपलब्ध नहीं है।",
        loadError: "सब्सक्रिप्शन जानकारी लोड नहीं हो सकी।",
        razorpayError: "Razorpay चेकआउट लोड नहीं हो सका।",
        plans: {
            free: { name: "मुफ़्त", limit: "1 आवेदन/माह", description: "इंटर्नशिप के लिए आवेदन शुरू करें।", features: ["हर महीने 1 इंटर्नशिप आवेदन", "बेसिक प्रोफ़ाइल एक्सेस", "आवेदन ट्रैकिंग"] },
            bronze: { name: "ब्रॉन्ज़", limit: "3 आवेदन/माह", description: "इंटर्नशिप यात्रा शुरू करने वाले छात्रों के लिए।", features: ["हर महीने 3 इंटर्नशिप आवेदन", "आवेदन ट्रैकिंग", "मासिक सीमा रीसेट"] },
            silver: { name: "सिल्वर", limit: "5 आवेदन/माह", description: "अधिक अवसरों के लिए आवेदन करने वाले छात्रों के लिए।", features: ["हर महीने 5 इंटर्नशिप आवेदन", "आवेदन ट्रैकिंग", "मासिक सीमा रीसेट"] },
            gold: { name: "गोल्ड", limit: "असीमित आवेदन", description: "अधिकतम लचीलापन चाहने वाले छात्रों के लिए।", features: ["असीमित इंटर्नशिप आवेदन", "आवेदन ट्रैकिंग", "कोई मासिक आवेदन सीमा नहीं"] },
        },
    },

    pt: {
        back: "Voltar ao perfil",
        heading: "Planos de assinatura",
        subtitle: "Escolha um plano de acordo com suas necessidades de candidatura a estágios.",
        current: "SEU PLANO ATUAL",
        used: "Candidaturas utilizadas",
        remaining: "Candidaturas restantes",
        monthly: "Limite mensal de candidaturas",
        started: "Início",
        expiry: "Renovação/expiração",
        scheduled: "Sua assinatura será cancelada em",
        cancel: "Cancelar no fim do período",
        processing: "Processando...",
        choose: "Escolha seu plano",
        currentPlan: "Plano atual",
        freePlan: "Plano gratuito",
        choosePlan: "Escolher",
        loading: "Carregando detalhes da assinatura...",
        history: "Histórico de pagamentos e faturas",
        noPayments: "Nenhum pagamento de assinatura encontrado.",
        plan: "Plano",
        amount: "Valor",
        date: "Data",
        transaction: "ID da transação",
        invoice: "Fatura",
        status: "Status",
        download: "Baixar fatura",
        downloading: "Baixando...",
        paymentInfo: "Os pagamentos são processados com segurança pelo Razorpay. As compras de assinatura estão disponíveis somente entre 5h e 11h45 IST. A assinatura é ativada somente após a verificação do pagamento no servidor.",
        unlimited: "Ilimitado",
        unavailable: "Indisponível",
        signIn: "Entre na sua conta para visualizar sua assinatura.",
        sessionMissing: "Sua sessão está ausente. Entre novamente.",
        paymentLoading: "O serviço de pagamento ainda está carregando. Tente novamente.",
        emailMissing: "O e-mail da sua conta não está disponível.",
        verifying: "Verificando seu pagamento. Aguarde...",
        paymentSuccess: "Pagamento realizado! Sua assinatura está ativa.",
        verificationFailed: "Falha na verificação do pagamento.",
        verificationError: "Não foi possível concluir a verificação. Guarde seu ID de pagamento para suporte.",
        paymentClosed: "A janela de pagamento foi fechada. Nenhuma assinatura foi ativada.",
        paymentFailed: "Falha no pagamento. Tente novamente.",
        paymentStartError: "Não foi possível iniciar o pagamento.",
        cancelConfirm: "Agendar o cancelamento no fim do período atual? Seu plano pago continuará ativo até a expiração.",
        cancelError: "Não foi possível cancelar a assinatura.",
        invoiceError: "Não foi possível baixar a fatura. Tente novamente.",
        invoiceUnavailable: "A fatura não está disponível para este pagamento.",
        loadError: "Não foi possível carregar as informações da assinatura.",
        razorpayError: "Não foi possível carregar o checkout do Razorpay.",
        plans: {
            free: { name: "Gratuito", limit: "1 candidatura/mês", description: "Comece a se candidatar a estágios.", features: ["1 candidatura a estágio por mês", "Acesso básico ao perfil", "Acompanhamento de candidaturas"] },
            bronze: { name: "Bronze", limit: "3 candidaturas/mês", description: "Para estudantes que estão começando.", features: ["3 candidaturas por mês", "Acompanhamento de candidaturas", "Reinicialização mensal do limite"] },
            silver: { name: "Prata", limit: "5 candidaturas/mês", description: "Para estudantes que buscam mais oportunidades.", features: ["5 candidaturas por mês", "Acompanhamento de candidaturas", "Reinicialização mensal do limite"] },
            gold: { name: "Ouro", limit: "Candidaturas ilimitadas", description: "Para estudantes que desejam máxima flexibilidade.", features: ["Candidaturas ilimitadas", "Acompanhamento de candidaturas", "Sem limite mensal"] },
        },
    },

    zh: {
        back: "返回个人资料",
        heading: "订阅计划",
        subtitle: "选择适合你实习申请需求的计划。",
        current: "当前计划",
        used: "已使用申请次数",
        remaining: "剩余申请次数",
        monthly: "每月申请限额",
        started: "开始日期",
        expiry: "续订/到期日期",
        scheduled: "你的订阅计划将在以下日期取消：",
        cancel: "在周期结束时取消",
        processing: "处理中...",
        choose: "选择你的计划",
        currentPlan: "当前计划",
        freePlan: "免费计划",
        choosePlan: "选择",
        loading: "正在加载订阅信息...",
        history: "付款记录和发票",
        noPayments: "没有找到订阅付款记录。",
        plan: "计划",
        amount: "金额",
        date: "日期",
        transaction: "交易编号",
        invoice: "发票",
        status: "状态",
        download: "下载发票",
        downloading: "正在下载...",
        paymentInfo: "付款通过 Razorpay 安全处理。订阅购买时间仅限印度标准时间上午 5:00 至 11:45。只有服务器成功验证付款后，订阅才会激活。",
        unlimited: "无限",
        unavailable: "不可用",
        signIn: "请登录以查看订阅。",
        sessionMissing: "登录会话不存在，请重新登录。",
        paymentLoading: "支付服务仍在加载，请重试。",
        emailMissing: "无法获取你的账户邮箱。",
        verifying: "正在验证付款，请稍候...",
        paymentSuccess: "付款成功！你的订阅现已激活。",
        verificationFailed: "付款验证失败。",
        verificationError: "无法完成付款验证。请保留付款编号以便获得支持。",
        paymentClosed: "付款窗口已关闭，订阅未激活。",
        paymentFailed: "付款失败，请重试。",
        paymentStartError: "无法开始付款。",
        cancelConfirm: "确定在当前计费周期结束时取消吗？你的付费计划将在到期前继续有效。",
        cancelError: "无法取消订阅。",
        invoiceError: "无法下载发票，请重试。",
        invoiceUnavailable: "此付款没有可用发票。",
        loadError: "无法加载订阅信息。",
        razorpayError: "无法加载 Razorpay 支付页面。",
        plans: {
            free: { name: "免费", limit: "每月 1 次申请", description: "开始申请实习机会。", features: ["每月 1 次实习申请", "基本个人资料访问", "申请进度跟踪"] },
            bronze: { name: "青铜", limit: "每月 3 次申请", description: "适合刚开始实习之旅的学生。", features: ["每月 3 次实习申请", "申请进度跟踪", "每月限额重置"] },
            silver: { name: "白银", limit: "每月 5 次申请", description: "适合申请更多机会的学生。", features: ["每月 5 次实习申请", "申请进度跟踪", "每月限额重置"] },
            gold: { name: "黄金", limit: "无限申请", description: "适合希望获得最大灵活性的学生。", features: ["无限实习申请", "申请进度跟踪", "没有每月申请限制"] },
        },
    },

    fr: {
        back: "Retour au profil",
        heading: "Forfaits d'abonnement",
        subtitle: "Choisissez un forfait adapté à vos besoins de candidature aux stages.",
        current: "VOTRE FORFAIT ACTUEL",
        used: "Candidatures utilisées",
        remaining: "Candidatures restantes",
        monthly: "Limite mensuelle de candidatures",
        started: "Début",
        expiry: "Renouvellement/expiration",
        scheduled: "Votre abonnement sera annulé le",
        cancel: "Annuler à la fin de la période",
        processing: "Traitement en cours...",
        choose: "Choisissez votre forfait",
        currentPlan: "Forfait actuel",
        freePlan: "Forfait gratuit",
        choosePlan: "Choisir",
        loading: "Chargement des informations de l'abonnement...",
        history: "Historique des paiements et factures",
        noPayments: "Aucun paiement d'abonnement trouvé.",
        plan: "Forfait",
        amount: "Montant",
        date: "Date",
        transaction: "ID de transaction",
        invoice: "Facture",
        status: "Statut",
        download: "Télécharger la facture",
        downloading: "Téléchargement...",
        paymentInfo: "Les paiements sont traités en toute sécurité par Razorpay. Les achats d'abonnement sont disponibles uniquement entre 5 h et 11 h 45 IST. Votre abonnement est activé uniquement après vérification du paiement côté serveur.",
        unlimited: "Illimité",
        unavailable: "Indisponible",
        signIn: "Connectez-vous pour consulter votre abonnement.",
        sessionMissing: "Votre session est manquante. Veuillez vous reconnecter.",
        paymentLoading: "Le service de paiement est en cours de chargement. Réessayez.",
        emailMissing: "L'adresse e-mail de votre compte est indisponible.",
        verifying: "Vérification du paiement. Veuillez patienter...",
        paymentSuccess: "Paiement réussi ! Votre abonnement est maintenant actif.",
        verificationFailed: "La vérification du paiement a échoué.",
        verificationError: "La vérification n'a pas pu être terminée. Conservez votre identifiant de paiement pour obtenir de l'aide.",
        paymentClosed: "La fenêtre de paiement a été fermée. Aucun abonnement n'a été activé.",
        paymentFailed: "Le paiement a échoué. Veuillez réessayer.",
        paymentStartError: "Impossible de démarrer le paiement.",
        cancelConfirm: "Programmer l'annulation à la fin de la période actuelle ? Votre forfait payant restera actif jusqu'à son expiration.",
        cancelError: "Impossible d'annuler l'abonnement.",
        invoiceError: "Impossible de télécharger la facture. Veuillez réessayer.",
        invoiceUnavailable: "La facture n'est pas disponible pour ce paiement.",
        loadError: "Impossible de charger les informations de l'abonnement.",
        razorpayError: "Impossible de charger le paiement Razorpay.",
        plans: {
            free: { name: "Gratuit", limit: "1 candidature/mois", description: "Commencez à postuler à des stages.", features: ["1 candidature par mois", "Accès au profil de base", "Suivi des candidatures"] },
            bronze: { name: "Bronze", limit: "3 candidatures/mois", description: "Pour les étudiants qui débutent leur parcours.", features: ["3 candidatures par mois", "Suivi des candidatures", "Réinitialisation mensuelle du quota"] },
            silver: { name: "Argent", limit: "5 candidatures/mois", description: "Pour les étudiants qui postulent à davantage d'opportunités.", features: ["5 candidatures par mois", "Suivi des candidatures", "Réinitialisation mensuelle du quota"] },
            gold: { name: "Or", limit: "Candidatures illimitées", description: "Pour les étudiants qui souhaitent une flexibilité maximale.", features: ["Candidatures illimitées", "Suivi des candidatures", "Aucune limite mensuelle"] },
        },
    },
};


type SubscriptionMessageKey =
    | "signIn"
    | "sessionMissing"
    | "paymentLoading"
    | "emailMissing"
    | "verifying"
    | "paymentSuccess"
    | "verificationFailed"
    | "verificationError"
    | "paymentClosed"
    | "paymentFailed"
    | "paymentStartError"
    | "cancelError"
    | "invoiceError"
    | "invoiceUnavailable"
    | "loadError"
    | "razorpayError";

const SubscriptionPage = () => {
    const { language } = useLanguage();
    const text = subscriptionTranslations[language];

    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [buyingPlan, setBuyingPlan] = useState<PlanName | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [messageKey, setMessageKey] = useState<SubscriptionMessageKey | null>(null);
    const [messageFallback, setMessageFallback] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error">("error");
    const [razorpayLoaded, setRazorpayLoaded] = useState(false);
    const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);

    const message = messageKey ? text[messageKey] : messageFallback;

    const showMessage = (
        value: string,
        type: "success" | "error" = "error"
    ) => {
        setMessageKey(null);
        setMessageFallback(value);
        setMessageType(type);
    };

    const showTranslatedMessage = (
        key: SubscriptionMessageKey,
        type: "success" | "error" = "error"
    ) => {
        setMessageKey(key);
        setMessageFallback("");
        setMessageType(type);
    };

    const getHeaders = useCallback(async () => {
        const user = auth.currentUser;

        if (!user) {
            throw new Error("Please sign in to manage your subscription.");
        }

        const token = await user.getIdToken();
        const session = localStorage.getItem("internarea_login_session");

        if (!session) {
            throw new Error("Your login session is missing. Please sign in again.");
        }

        return {
            Authorization: `Bearer ${token}`,
            "x-login-session": session,
        };
    }, []);

    const loadSubscription = useCallback(async () => {
        try {
            setLoading(true);

            const headers = await getHeaders();

            const [subscriptionResponse, paymentResponse] = await Promise.all([
                axios.get(`${API_BASE}/subscription/me`, { headers }),
                axios.get(`${API_BASE}/subscription/payments`, { headers }),
            ]);

            setSubscription(subscriptionResponse.data.subscription);
            setPayments(paymentResponse.data.payments || []);
        } catch (error: any) {
            console.error("Subscription loading error:", error);

            if (error.response?.data?.message) {
                showMessage(error.response.data.message);
            } else if (error.message?.includes("session")) {
                showTranslatedMessage("sessionMissing");
            } else {
                showTranslatedMessage("loadError");
            }
        } finally {
            setLoading(false);
        }
    }, [getHeaders]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                loadSubscription();
            } else {
                setLoading(false);
                showTranslatedMessage("signIn");
            }
        });

        return () => unsubscribe();
    }, [loadSubscription]);

    const downloadInvoice = async (payment: PaymentRecord) => {
        if (payment.status !== "paid") {
            showTranslatedMessage("invoiceUnavailable");
            return;
        }

        try {
            setDownloadingInvoice(payment._id);

            const response = await axios.get(
                `${API_BASE}/subscription/invoice/${encodeURIComponent(payment._id)}`,
                {
                    headers: await getHeaders(),
                    responseType: "blob",
                }
            );

            const blob = new Blob([response.data], {
                type: "application/pdf",
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `InternArea-Invoice-${payment.invoiceNumber || payment._id}.pdf`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 1000);
        } catch (error: any) {
            console.error("Invoice download error:", error);

            let errorMessage = text.invoiceError;
            const responseData = error.response?.data;

            if (responseData instanceof Blob) {
                try {
                    const errorData = JSON.parse(await responseData.text());
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    // Keep translated fallback.
                }
            } else if (responseData?.message) {
                errorMessage = responseData.message;
            }

            showMessage(errorMessage);
        } finally {
            setDownloadingInvoice(null);
        }
    };

    const purchasePlan = async (plan: PlanName) => {
        if (plan === "free") return;

        setMessageKey(null);
        setMessageFallback("");

        if (!razorpayLoaded || !window.Razorpay) {
            showTranslatedMessage("paymentLoading");
            return;
        }

        try {
            setBuyingPlan(plan);

            const headers = await getHeaders();

            const orderResponse = await axios.post(
                `${API_BASE}/subscription/create-order`,
                { plan },
                { headers }
            );

            const order = orderResponse.data;
            const user = auth.currentUser;

            if (!user?.email) {
                showTranslatedMessage("emailMissing");
                setBuyingPlan(null);
                return;
            }

            const options = {
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: "Internarea",
                description: `${plan.toUpperCase()} Subscription`,
                order_id: order.orderId,
                prefill: {
                    name: user.displayName || "",
                    email: user.email,
                },
                theme: {
                    color: "#2563eb",
                },
                handler: async (response: any) => {
                    try {
                        showTranslatedMessage("verifying", "success");

                        const verification = await axios.post(
                            `${API_BASE}/subscription/verify-payment`,
                            {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            },
                            { headers: await getHeaders() }
                        );

                        if (verification.data.success) {
                            showTranslatedMessage("paymentSuccess", "success");
                            await loadSubscription();
                        } else {
                            showMessage(
                                verification.data.message || text.verificationFailed
                            );
                        }
                    } catch (error: any) {
                        if (error.response?.data?.message) {
                            showMessage(error.response.data.message);
                        } else {
                            showTranslatedMessage("verificationError");
                        }
                    } finally {
                        setBuyingPlan(null);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setBuyingPlan(null);
                        showTranslatedMessage("paymentClosed");
                    },
                },
            };

            const checkout = new window.Razorpay(options);

            checkout.on("payment.failed", (response: any) => {
                setBuyingPlan(null);

                showMessage(
                    response.error?.description || text.paymentFailed
                );
            });

            checkout.open();
        } catch (error: any) {
            setBuyingPlan(null);

            if (error.response?.data?.message) {
                showMessage(error.response.data.message);
            } else if (error.message?.includes("session")) {
                showTranslatedMessage("sessionMissing");
            } else {
                showTranslatedMessage("paymentStartError");
            }
        }
    };

    const cancelSubscription = async () => {
        const confirmed = window.confirm(text.cancelConfirm);

        if (!confirmed) return;

        try {
            setCancelling(true);
            setMessageKey(null);
            setMessageFallback("");

            const response = await axios.post(
                `${API_BASE}/subscription/cancel`,
                {},
                { headers: await getHeaders() }
            );

            showMessage(response.data.message, "success");
            await loadSubscription();
        } catch (error: any) {
            if (error.response?.data?.message) {
                showMessage(error.response.data.message);
            } else {
                showTranslatedMessage("cancelError");
            }
        } finally {
            setCancelling(false);
        }
    };

    const currentPlan = plans.find(
        (plan) => plan.id === subscription?.plan
    );

    return (
        <>
            <Script
                src="https://checkout.razorpay.com/v1/checkout.js"
                strategy="afterInteractive"
                onLoad={() => setRazorpayLoaded(true)}
                onError={() => {
                    setRazorpayLoaded(false);
                    showTranslatedMessage("razorpayError");
                }}
            />

            <main className="min-h-screen bg-gray-50 px-4 py-8">
                <div className="w-full max-w-none mx-auto">
                    <Link
                        href="/profile"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {text.back}
                    </Link>

                    <div className="mb-8">
                        <div className="flex items-center gap-3">
                            <Crown className="w-8 h-8 text-blue-600" />
                            <h1 className="text-3xl font-bold text-gray-900">
                                {text.heading}
                            </h1>
                        </div>
                        <p className="text-gray-600 mt-2">{text.subtitle}</p>
                    </div>

                    {message && (
                        <div
                            role="status"
                            aria-live="polite"
                            className={`mb-6 rounded-lg p-4 text-sm ${
                                messageType === "success"
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                        >
                            {message}
                        </div>
                    )}

                    {loading ? (
                        <div className="bg-white rounded-xl p-10 text-center shadow-sm">
                            <RefreshCw className="w-7 h-7 animate-spin text-blue-600 mx-auto mb-3" />
                            <p className="text-gray-600">{text.loading}</p>
                        </div>
                    ) : (
                        <>
                            {subscription && (
                                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-10">
                                    <div className="flex flex-wrap justify-between gap-4 items-start">
                                        <div>
                                            <p className="text-sm text-gray-500">
                                                {text.current}
                                            </p>
                                            <h2 className="text-2xl font-bold text-gray-900 mt-1 capitalize">
                                                {text.plans[subscription.plan].name}
                                            </h2>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {text.plans[subscription.plan].limit}
                                            </p>
                                        </div>

                                        <span className="rounded-full bg-green-100 text-green-700 px-3 py-1 text-sm font-semibold capitalize">
                                            {subscription.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                                        <div className="rounded-xl bg-blue-50 p-4">
                                            <p className="text-sm text-blue-700">{text.used}</p>
                                            <p className="text-2xl font-bold text-blue-900 mt-1">
                                                {subscription.applicationsUsed}
                                            </p>
                                        </div>

                                        <div className="rounded-xl bg-green-50 p-4">
                                            <p className="text-sm text-green-700">{text.remaining}</p>
                                            <p className="text-2xl font-bold text-green-900 mt-1">
                                                {subscription.remainingApplications === -1
                                                    ? text.unlimited
                                                    : subscription.remainingApplications}
                                            </p>
                                        </div>

                                        <div className="rounded-xl bg-purple-50 p-4">
                                            <p className="text-sm text-purple-700">{text.monthly}</p>
                                            <p className="text-2xl font-bold text-purple-900 mt-1">
                                                {subscription.monthlyLimit === -1
                                                    ? text.unlimited
                                                    : subscription.monthlyLimit}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-5 mt-5 text-sm text-gray-600">
                                        <span className="inline-flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4" />
                                            {text.started}: {formatDate(subscription.startedAt, language)}
                                        </span>

                                        <span className="inline-flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4" />
                                            {text.expiry}: {formatDate(subscription.expiresAt, language)}
                                        </span>
                                    </div>

                                    {subscription.cancelAtPeriodEnd && (
                                        <div className="mt-5 rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800">
                                            {text.scheduled}{" "}
                                            {formatDate(subscription.expiresAt, language)}.
                                        </div>
                                    )}

                                    {subscription.plan !== "free" &&
                                        !subscription.cancelAtPeriodEnd && (
                                            <button
                                                onClick={cancelSubscription}
                                                disabled={cancelling}
                                                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                {cancelling ? text.processing : text.cancel}
                                            </button>
                                        )}
                                </section>
                            )}

                            <section className="mb-12">
                                <h2 className="text-2xl font-bold text-gray-900 mb-5">
                                    {text.choose}
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                    {plans.map((plan) => {
                                        const translatedPlan = text.plans[plan.id];
                                        const isCurrent = subscription?.plan === plan.id;

                                        return (
                                            <div
                                                key={plan.id}
                                                className={`relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${
                                                    isCurrent
                                                        ? "border-blue-500 ring-2 ring-blue-100"
                                                        : "border-gray-200"
                                                }`}
                                            >
                                                {isCurrent && (
                                                    <span className="absolute -top-3 left-4 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                                                        {text.currentPlan}
                                                    </span>
                                                )}

                                                <h3 className="text-xl font-bold text-gray-900 mt-2">
                                                    {translatedPlan.name}
                                                </h3>

                                                <p className="text-sm text-gray-500 mt-2 min-h-10">
                                                    {translatedPlan.description}
                                                </p>

                                                <div className="my-5">
                                                    <span className="text-3xl font-bold text-gray-900">
                                                        ₹{plan.price.toLocaleString("en-IN")}
                                                    </span>
                                                    {plan.price > 0 && (
                                                        <span className="text-sm text-gray-500">
                                                            /{language === "hi" ? "माह" : language === "zh" ? "月" : "month"}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="font-semibold text-blue-700 text-sm mb-4">
                                                    {translatedPlan.limit}
                                                </p>

                                                <ul className="space-y-3 text-sm text-gray-600 flex-1">
                                                    {translatedPlan.features.map((feature, index) => (
                                                        <li key={index} className="flex gap-2">
                                                            <Check className="w-4 h-4 text-green-600 shrink-0" />
                                                            {feature}
                                                        </li>
                                                    ))}
                                                </ul>

                                                <button
                                                    type="button"
                                                    disabled={
                                                        isCurrent ||
                                                        plan.id === "free" ||
                                                        buyingPlan !== null ||
                                                        loading
                                                    }
                                                    onClick={() => purchasePlan(plan.id)}
                                                    className={`w-full mt-6 rounded-lg py-3 font-semibold transition-colors ${
                                                        isCurrent || plan.id === "free"
                                                            ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                                            : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                                    }`}
                                                >
                                                    {isCurrent
                                                        ? text.currentPlan
                                                        : buyingPlan === plan.id
                                                            ? text.processing
                                                            : plan.id === "free"
                                                                ? text.freePlan
                                                                : `${text.choosePlan} ${translatedPlan.name}`}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* PAYMENT HISTORY */}
                            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center gap-3 mb-5">
                                    <CreditCard className="w-6 h-6 text-blue-600" />
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {text.history}
                                    </h2>
                                </div>

                                {payments.length === 0 ? (
                                    <p className="text-sm text-gray-500 py-5">
                                        {text.noPayments}
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead>
                                                <tr className="border-b text-gray-500">
                                                    <th className="py-3 pr-4">{text.plan}</th>
                                                    <th className="py-3 pr-4">{text.amount}</th>
                                                    <th className="py-3 pr-4">{text.date}</th>
                                                    <th className="py-3 pr-4">{text.transaction}</th>
                                                    <th className="py-3 pr-4">{text.invoice}</th>
                                                    <th className="py-3 pr-4">{text.download}</th>
                                                    <th className="py-3">{text.status}</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {payments.map((payment) => (
                                                    <tr key={payment._id} className="border-b last:border-0">
                                                        <td className="py-4 pr-4 font-semibold capitalize">
                                                            {text.plans[payment.plan].name}
                                                        </td>
                                                        <td className="py-4 pr-4">
                                                            ₹{(payment.amount / 100).toLocaleString("en-IN")}
                                                        </td>
                                                        <td className="py-4 pr-4">
                                                            {formatDate(payment.paidAt || payment.createdAt, language)}
                                                        </td>
                                                        <td className="py-4 pr-4 break-all">
                                                            {payment.razorpayPaymentId || "—"}
                                                        </td>
                                                        <td className="py-4 pr-4">
                                                            {payment.invoiceNumber || "—"}
                                                        </td>
                                                        <td className="py-4 pr-4">
                                                            {payment.status === "paid" && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => downloadInvoice(payment)}
                                                                    disabled={downloadingInvoice === payment._id}
                                                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                                                                >
                                                                    {downloadingInvoice === payment._id
                                                                        ? text.downloading
                                                                        : text.download}
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="py-4">
                                                            <span
                                                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                                                    payment.status === "paid"
                                                                        ? "bg-green-100 text-green-700"
                                                                        : payment.status === "failed"
                                                                            ? "bg-red-100 text-red-700"
                                                                            : "bg-yellow-100 text-yellow-700"
                                                                }`}
                                                            >
                                                                {payment.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>

                            <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                                <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                                <p>{text.paymentInfo}</p>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </>
    );
};

export default SubscriptionPage;
