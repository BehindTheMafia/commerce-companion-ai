import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import {
  ShoppingBag,
  CheckCircle2,
  ArrowRight,
  Check,
  Shirt,
  Sparkles,
  Wrench,
  Pill,
  ShoppingBasket,
  Laptop,
  LayoutGrid,
  MousePointerClick,
  MessageSquare,
  SlidersHorizontal,
  LogIn,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const pulseDot = (
  <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563EB] opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2563EB]" />
  </span>
);

function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    
    // Enable smooth scrolling
    document.documentElement.style.scrollBehavior = "smooth";
    
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] text-[#64748B] selection:bg-[#EFF6FF] selection:text-[#1D4ED8] font-sans">

      {/* ---- Header ---- */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 h-16 border-b transition-all duration-500 ${
          scrolled ? "bg-white/80 backdrop-blur-md border-[#E2E8F0] shadow-sm" : "bg-transparent border-transparent"
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-6 h-full flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 group">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: -10 }}
              whileTap={{ scale: 0.9 }}
              className="w-8 h-8 bg-[#2563EB] rounded-md flex items-center justify-center text-white shadow-sm"
            >
              <ShoppingBag size={18} strokeWidth={2.5} />
            </motion.div>
            <span className="text-xl font-bold tracking-[-0.04em] font-display text-[#0B0F19]">
              HyperBee
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: "Cómo funciona", href: "#how-it-works" },
              { label: "Beneficios", href: "#features" },
              { label: "Precios", href: "#pricing" }
            ].map((item) => (
              <a 
                key={item.label}
                href={item.href}
                className="relative text-sm font-medium text-[#64748B] hover:text-[#2563EB] transition-colors group py-2"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#2563EB] transition-all duration-300 group-hover:w-full rounded-full" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              to="/auth"
              className="hidden md:flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#0B0F19] transition-colors group"
            >
              <LogIn size={16} className="group-hover:translate-x-1 transition-transform" />
              Iniciar sesión
            </Link>
            <Link to="/auth">
              <motion.button
                whileHover={{ scale: 1.05, y: -2, boxShadow: "0 10px 25px -5px rgba(37,99,235,0.3)" }}
                whileTap={{ scale: 0.95 }}
                className="bg-[#0B0F19] text-white hover:bg-[#2563EB] transition-colors duration-300 font-medium px-5 py-2 rounded-full text-sm flex items-center gap-2"
              >
                Prueba Gratis
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.header>

      <main className="relative pt-24 pb-16 lg:pb-24">
        <div className="absolute inset-0 grid-pattern z-0 opacity-50 pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-20 w-72 h-72 bg-[#EFF6FF] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
          <div className="absolute top-20 right-20 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" style={{ animationDelay: "2s" }} />
        </div>

        <div className="max-w-[1280px] mx-auto px-6 relative z-10 pt-16">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
            }}
            className="text-center max-w-4xl mx-auto space-y-6 mb-12"
          >
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] } } }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#2563EB]/20 bg-blue-50/50 backdrop-blur-sm text-xs font-semibold text-[#2563EB] shadow-sm">
              {pulseDot}
              La forma más inteligente de vender por WhatsApp 🚀
            </motion.div>

            <motion.h1 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] } } }} className="text-5xl md:text-6xl lg:text-[72px] font-bold text-[#0B0F19] tracking-[-0.04em] font-display leading-[1.1] text-balance">
              Tu catálogo online.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#38BDF8]">Pedidos listos en WhatsApp.</span>
            </motion.h1>

            <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] } } }} className="text-lg md:text-xl text-[#64748B] font-sans leading-relaxed max-w-2xl mx-auto font-light">
              Libérate de responder precios todo el día. Crea tu tienda en 5 minutos, comparte un solo enlace y deja que tus clientes compren solos. <strong className="font-semibold text-[#374151]">Tú solo cobras y despachas.</strong>
            </motion.p>

            <motion.ul variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] } } }} className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm font-medium text-[#374151] mt-8">
              {["Listo en 5 minutos", "Cero comisiones por venta", "Pedidos automatizados"].map((text) => (
                <li key={text} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-[#E2E8F0] shadow-sm">
                  <CheckCircle2 size={16} className="text-[#2563EB]" />
                  {text}
                </li>
              ))}
            </motion.ul>

            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] } } }} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Link to="/auth">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2, boxShadow: "0px 10px 30px -5px rgba(37, 99, 235, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-all duration-300 font-semibold px-8 py-4 rounded-full text-base flex items-center justify-center gap-2 group"
                >
                  Crear mi tienda gratis
                  <ArrowRight size={18} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
            </motion.div>
            <motion.p variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.8 } } }} className="text-xs text-[#94A3B8] pt-2">
              Prueba gratis 15 días • Sin tarjeta de crédito
            </motion.p>
          </motion.div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1], delay: 0.4 }}
            className="max-w-5xl mx-auto mt-16 relative group"
            style={{ perspective: 1000 }}
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-[#2563EB]/30 to-blue-400/30 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 group-hover:blur-2xl transition duration-700" />
            <motion.div 
              whileHover={{ rotateX: 2, rotateY: -1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{ transformStyle: "preserve-3d" }}
              className="relative bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_25px_50px_-12px_rgba(37,99,235,0.25)] overflow-hidden flex flex-col items-center"
            >
              <div className="w-full h-12 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center px-4 gap-2 relative">
                <div className="flex gap-2 z-10">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                  <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white border border-[#E2E8F0] shadow-sm text-xs text-[#64748B] px-6 py-1.5 rounded-md font-medium flex items-center gap-2">
                    <span className="w-3 h-3 bg-[#E2E8F0] rounded-sm flex items-center justify-center"><Check size={8} className="text-[#94A3B8]" /></span>
                    app.hyperbee.co
                  </div>
                </div>
              </div>
              <img
                src="https://placehold.co/1200x675/F8FAFC/64748B?text=Screenshot:+Dashboard+Principal\n(Muestra+métricas+y+vista+previa+del+catálogo)"
                alt="Dashboard Screenshot"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* ---- Marquee Section ---- */}
      <section className="bg-white border-y border-[#E2E8F0] py-10 relative overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-6 mb-4">
          <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider text-center">
            La plataforma elegida por negocios de todo tipo
          </p>
        </div>
        <div className="flex overflow-hidden relative w-full">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
            {[0, 1].map((set) => (
              <div key={set} className="flex items-center gap-16 px-8 grayscale opacity-60 hover:grayscale-0 transition-all duration-300">
                <div className="flex items-center gap-2 text-lg font-medium font-display text-[#374151]">
                  <Shirt size={24} /> Moda y Ropa
                </div>
                <div className="flex items-center gap-2 text-lg font-medium font-display text-[#374151]">
                  <Sparkles size={24} /> Cosméticos
                </div>
                <div className="flex items-center gap-2 text-lg font-medium font-display text-[#374151]">
                  <Wrench size={24} /> Ferreterías
                </div>
                <div className="flex items-center gap-2 text-lg font-medium font-display text-[#374151]">
                  <Pill size={24} /> Farmacias
                </div>
                <div className="flex items-center gap-2 text-lg font-medium font-display text-[#374151]">
                  <ShoppingBasket size={24} /> Pulperías
                </div>
                <div className="flex items-center gap-2 text-lg font-medium font-display text-[#374151]">
                  <Laptop size={24} /> Electrónica
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- How It Works ---- */}
      <section id="how-it-works" className="py-24 bg-[#F8FAFC] border-b border-[#E2E8F0] overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
            className="text-center mb-24"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#2563EB]/20 bg-[#EFF6FF] text-xs font-semibold text-[#2563EB] mb-6">
              Tan simple que parece magia ✨
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#0B0F19] tracking-[-0.04em] font-display mb-6">
              De la idea al pedido en 4 pasos
            </h2>
            <p className="text-[#64748B] text-lg font-sans max-w-2xl mx-auto">
              Un flujo optimizado paso a paso para eliminar la fricción entre tú y tus ventas. Configuras una vez, vendes en automático siempre.
            </p>
          </motion.div>

          <div className="space-y-32">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.2 } }
                }}
                className={`flex flex-col ${i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-12 lg:gap-24`}
              >
                <div className="w-full md:w-1/2 space-y-6 lg:px-8">
                  <motion.div
                    variants={{ hidden: { opacity: 0, x: i % 2 === 1 ? 40 : -40 }, visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.22, 0.61, 0.36, 1] } } }}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-display font-bold text-2xl shadow-sm border ${
                      step.isSuccess
                        ? "bg-gradient-to-br from-[#22C55E]/20 to-[#22C55E]/5 text-[#166534] border-[#22C55E]/30"
                        : "bg-gradient-to-br from-[#2563EB]/20 to-[#2563EB]/5 text-[#1E40AF] border-[#2563EB]/30"
                    }`}
                  >
                    {step.number}
                  </motion.div>
                  <motion.h3 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 0.61, 0.36, 1] } } }} className="text-3xl md:text-4xl font-bold text-[#0B0F19] font-display tracking-[-0.04em] leading-tight">
                    {step.title}
                  </motion.h3>
                  <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 0.61, 0.36, 1] } } }} className="text-[#64748B] text-lg leading-relaxed">
                    {step.description}
                  </motion.p>
                </div>
                <motion.div 
                  variants={{ hidden: { opacity: 0, scale: 0.95, rotate: i % 2 === 1 ? -2 : 2 }, visible: { opacity: 1, scale: 1, rotate: 0, transition: { duration: 1, ease: [0.22, 0.61, 0.36, 1] } } }}
                  className="w-full md:w-1/2 relative group"
                  style={{ perspective: 1000 }}
                >
                  <motion.div 
                    whileHover={{ rotateY: i % 2 === 1 ? -4 : 4, rotateX: 2, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    style={{ transformStyle: "preserve-3d" }}
                    className={`bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1),0_0_0_1px_#E2E8F0] overflow-hidden relative z-10 ${step.isMobile ? 'max-w-[320px] mx-auto' : ''}`}
                  >
                    <img
                      src={step.image}
                      alt={step.title}
                      className="w-full h-auto"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  </motion.div>
                  <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br ${step.isSuccess ? 'from-green-100 to-emerald-50' : 'from-blue-100 to-indigo-50'} rounded-full blur-3xl opacity-50 z-0 group-hover:opacity-80 transition-opacity duration-700`} />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Features ---- */}
      <section id="features" className="py-24 bg-white relative">
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#F8FAFC] to-transparent pointer-events-none" />
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#2563EB]/20 bg-[#EFF6FF] text-xs font-semibold text-[#2563EB] mb-6">
              Herramientas de crecimiento 📈
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#0B0F19] tracking-[-0.04em] font-display mb-6">
              Todo para profesionalizar tus ventas
            </h2>
            <p className="text-[#64748B] text-lg font-sans max-w-2xl mx-auto">
              Funciones poderosas diseñadas para maximizar tus conversiones, integradas en una interfaz que aprenderás a usar en minutos.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(340px,auto)]">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1], delay: i * 0.1 }}
                whileHover={{ y: -8 }}
                className={`${
                  feature.spanFull ? "md:col-span-2" : ""
                } bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 relative overflow-hidden flex flex-col justify-between group`}
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white to-transparent opacity-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:scale-150 transition-transform duration-700" />
                
                <div className="relative z-10 max-w-lg mb-8">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-sm border border-white/50 ${feature.iconBg}`}
                  >
                    <feature.icon size={24} strokeWidth={2} className={feature.iconColor} />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-[#0B0F19] font-display tracking-[-0.04em] mb-3 group-hover:text-[#2563EB] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-[#64748B] text-base leading-relaxed">{feature.description}</p>
                </div>
                
                <div className="relative mt-auto w-full rounded-xl overflow-hidden border border-[#E2E8F0] shadow-md transform group-hover:translate-y-2 transition-transform duration-500 bg-white">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFC]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 z-10 transition-opacity duration-300" />
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className={`w-full object-cover object-top transform group-hover:scale-[1.03] transition-transform duration-700 ease-out ${
                      feature.tall ? "h-64" : ""
                    }`}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Pricing ---- */}
      <section id="pricing" className="py-24 bg-[#F8FAFC] border-y border-[#E2E8F0] relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern z-0 opacity-[0.15] pointer-events-none" />
        <div className="absolute top-40 left-1/3 w-96 h-96 bg-[#2563EB]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#2563EB]/20 bg-[#EFF6FF] text-xs font-semibold text-[#2563EB] mb-6">
              Precios claros, sin sorpresas
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0B0F19] tracking-[-0.04em] font-display mb-4">
              Planes simples y transparentes
            </h2>
            <p className="text-[#64748B] font-sans max-w-2xl mx-auto">
              Comienza gratis hoy mismo. Escala a un plan de pago solo cuando estés listo para crecer.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <PlanCard key={plan.name} plan={plan} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="py-24 bg-white relative">
        <div className="max-w-[1280px] mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
            className="bg-gradient-to-br from-[#0B0F19] to-[#1E293B] rounded-[2.5rem] p-12 lg:p-24 text-center relative overflow-hidden shadow-2xl border border-[#374151]"
          >
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-[0.5px] border-white/10 rounded-full opacity-30 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border-[0.5px] border-white/20 rounded-full opacity-50 pointer-events-none" />
            
            {/* Floating particles */}
            <motion.div animate={{ y: [0, -30, 0], opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/4 left-1/4 w-3 h-3 bg-blue-400 rounded-full blur-[2px]" />
            <motion.div animate={{ y: [0, 40, 0], opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute bottom-1/4 right-1/4 w-4 h-4 bg-purple-400 rounded-full blur-[2px]" />

            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-[-0.04em] font-display mb-6 leading-[1.1]">
                Deja de perder ventas por no responder a tiempo.
              </h2>
              <p className="text-[#94A3B8] text-lg lg:text-xl mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                Digitaliza tus ventas hoy. Únete a cientos de negocios que ya están vendiendo en automático con HyperBee. Configúralo en 5 minutos.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link to="/auth" className="w-full sm:w-auto">
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto bg-[#2563EB] text-white hover:bg-[#3B82F6] transition-all duration-300 font-semibold px-10 py-4 rounded-full text-lg shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2 group border border-blue-400/20"
                  >
                    Crear mi tienda gratis
                    <ArrowRight size={20} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </Link>
                <Link to="/auth" className="w-full sm:w-auto">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto bg-white/5 text-white hover:bg-white/10 border border-white/10 transition-all duration-300 font-medium px-8 py-4 rounded-full text-lg flex items-center justify-center backdrop-blur-sm"
                  >
                    Ver una demo
                  </motion.button>
                </Link>
              </div>
              <p className="mt-8 text-sm text-[#64748B] flex flex-wrap items-center justify-center gap-2">
                <span className="flex items-center gap-1.5"><Check size={14} className="text-[#22C55E]" /> Prueba de 15 días gratis</span>
                <span className="w-1 h-1 bg-[#475569] rounded-full mx-1 hidden sm:block" />
                <span className="flex items-center gap-1.5"><Check size={14} className="text-[#22C55E]" /> Sin tarjeta de crédito</span>
                <span className="w-1 h-1 bg-[#475569] rounded-full mx-1 hidden sm:block" />
                <span className="hidden sm:flex items-center gap-1.5"><Check size={14} className="text-[#22C55E]" /> Cancela cuando quieras</span>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="bg-white border-t border-[#E2E8F0] pt-16 pb-8">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <a href="#" className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-[#2563EB] rounded flex items-center justify-center text-white">
                  <ShoppingBag size={14} strokeWidth={2.5} />
                </div>
                <span className="text-lg font-bold tracking-[-0.04em] font-display text-[#0B0F19]">HyperBee</span>
              </a>
              <p className="text-sm text-[#64748B] max-w-xs leading-relaxed">
                El software para que comercios y emprendedores gestionen su catálogo online y cierren ventas en WhatsApp fácilmente.
              </p>
            </div>
            {footerColumns.map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-bold text-[#0B0F19] uppercase tracking-wider mb-4">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-sm text-[#64748B] hover:text-[#2563EB] transition-colors">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-[#E2E8F0] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[#94A3B8]">© 2026 HyperBee Commerce. Todos los derechos reservados.</p>
            <div className="flex gap-6">
              <a href="#" className="text-xs text-[#94A3B8] hover:text-[#0B0F19] transition-colors">Políticas de Privacidad</a>
              <a href="#" className="text-xs text-[#94A3B8] hover:text-[#0B0F19] transition-colors">Términos del Servicio</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---- PlanCard Component ---- */

function PlanCard({ plan, index }: { plan: (typeof plans)[number]; index: number }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: "-40px" });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => setMousePos({ x: 0, y: 0 });

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.6,
        ease: [0.22, 0.61, 0.36, 1],
        delay: index * 0.12,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: "preserve-3d",
        transform: isInView
          ? `perspective(1000px) rotateX(${mousePos.y * -6}deg) rotateY(${mousePos.x * 6}deg)`
          : "perspective(1000px) rotateX(0deg) rotateY(0deg)",
      }}
      className={`relative transition-transform duration-200 ease-out will-change-transform ${
        plan.highlighted
          ? "bg-[#0B0F19] border-2 border-[#2563EB] shadow-[0_25px_50px_-12px_rgba(37,99,235,0.25)] md:-translate-y-2"
          : "bg-white border border-[#E2E8F0] shadow-sm hover:shadow-[0_8px_30px_-8px_rgba(11,15,25,0.12)]"
      } rounded-2xl p-8 flex flex-col group`}
    >
      {plan.highlighted && (
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-[#2563EB]/30 via-transparent to-[#2563EB]/10 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500 -z-10" />
      )}

      {plan.highlighted && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 15 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-full shadow-lg flex items-center gap-1.5 animate-float whitespace-nowrap"
        >
          Más Recomendado
        </motion.div>
      )}

      <div className="mb-6">
        <h3 className={`text-xl font-bold font-display mb-2 ${plan.highlighted ? "text-white" : "text-[#0B0F19]"}`}>
          {plan.name}
        </h3>
        <p className={`text-sm ${plan.highlighted ? "text-[#94A3B8]" : "text-[#64748B]"}`}>{plan.subtitle}</p>
      </div>

      <div className="mb-8">
        <div className="flex items-baseline gap-1">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + index * 0.12, duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
            className={`text-4xl font-bold font-display ${plan.highlighted ? "text-white" : "text-[#0B0F19]"}`}
          >
            {plan.price}
          </motion.span>
          {plan.period && (
            <span className={`font-medium ${plan.highlighted ? "text-[#94A3B8]" : "text-[#64748B]"}`}>
              {plan.period}
            </span>
          )}
        </div>
        {plan.footnote && (
          <p className="text-xs text-[#94A3B8] mt-1 font-medium">{plan.footnote}</p>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature, fi) => (
          <motion.li
            key={feature}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{
              delay: 0.3 + index * 0.12 + fi * 0.08,
              duration: 0.4,
              ease: [0.22, 0.61, 0.36, 1],
            }}
            className="flex items-start gap-3 text-sm text-[#374151]"
          >
            <motion.div
              whileHover={{ scale: 1.2, rotate: -5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Check
                size={18}
                className={
                  plan.highlighted
                    ? "text-[#3B82F6] mt-0.5 shrink-0"
                    : "text-[#22C55E] mt-0.5 shrink-0"
                }
              />
            </motion.div>
            <span className={plan.highlighted ? "text-[#F8FAFC]" : ""}>{feature}</span>
          </motion.li>
        ))}
      </ul>

      <Link to="/auth" className="w-full">
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className={`w-full font-medium px-4 py-3 rounded-lg text-sm transition-all duration-300 ${
            plan.highlighted
              ? "bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-lg hover:shadow-[0_4px_20px_-4px_rgba(37,99,235,0.4)]"
              : "bg-[#F8FAFC] text-[#0B0F19] border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-white hover:text-[#2563EB] hover:shadow-sm"
          }`}
        >
          {plan.cta}
        </motion.button>
      </Link>
    </motion.div>
  );
}

/* ---- Data ---- */

const steps = [
  {
    number: 1,
    title: "1. Crea tu catálogo en minutos",
    description:
      "Sube fotos de tus productos, añade descripciones atractivas y precios. Nuestra plataforma es tan intuitiva que tendrás tu tienda online lista para vender hoy mismo, sin complicaciones técnicas.",
    image:
      "https://placehold.co/800x600/F1F5F9/475569?text=Screenshot:+Gesti%C3%B3n+de+Productos\n(Panel+Administrativo)",
    isMobile: false,
    isSuccess: false,
  },
  {
    number: 2,
    title: "2. Comparte tu único enlace",
    description:
      "Despídete de enviar fotos sueltas y PDFs pesados por chat. Coloca tu enlace de HyperBee en tu bio de Instagram, TikTok o envíalo directamente a tus clientes por WhatsApp. Tu negocio, siempre disponible.",
    image:
      "https://placehold.co/800x600/F1F5F9/475569?text=Screenshot:+Perfil+de+Instagram/WhatsApp\n(Mostrando+el+link+de+la+tienda)",
    isMobile: false,
    isSuccess: false,
  },
  {
    number: 3,
    title: "3. Tus clientes compran solos",
    description:
      "Ofrece una experiencia de compra premium y sin fricción. Tus clientes pueden navegar desde su celular, elegir productos, seleccionar opciones y llenar su carrito, todo sin crear cuentas molestas ni descargar apps.",
    image:
      "https://placehold.co/375x812/FFFFFF/64748B?text=Screenshot:+Checkout+M%C3%B3vil\n(Cat%C3%A1logo+y+Carrito)",
    isMobile: true,
    isSuccess: false,
  },
  {
    number: 4,
    title: "4. Recibe pedidos listos para cobrar",
    description:
      "Cuando tu cliente finaliza la compra, recibes instantáneamente un mensaje en WhatsApp estructurado con precisión: qué quieren, cuánto es y a dónde enviarlo. Cero confusiones, 100% ventas cerradas.",
    image:
      "https://placehold.co/800x600/F1F5F9/22C55E?text=Screenshot:+Mensaje+generado+en+WhatsApp\n(Lista+de+pedido+estructurada)",
    isMobile: false,
    isSuccess: true,
  },
];

const features = [
  {
    icon: LayoutGrid,
    title: "Vendedora estrella 24/7",
    description:
      "Tu catálogo nunca duerme. Muestra tus productos con fotos impecables y descripciones que venden, permitiendo a tus clientes comprar a cualquier hora, incluso cuando tú descansas.",
    image:
      "https://placehold.co/800x400/FFFFFF/475569?text=Screenshot:+Vista+Desktop+del+Cat%C3%A1logo\n(Grid+de+productos)",
    spanFull: true,
    tall: true,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    icon: MousePointerClick,
    title: "Checkout de alta conversión",
    description:
      "Diseñado obsesivamente para evitar carritos abandonados. Solo pedimos la información estrictamente necesaria para cerrar la venta rápido y fácil.",
    image:
      "https://placehold.co/400x300/FFFFFF/475569?text=Screenshot:+Formulario+de+Checkout",
    spanFull: false,
    tall: false,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
  {
    icon: MessageSquare,
    title: "Directo a tu WhatsApp",
    description:
      "Sin intermediarios. Cada pedido se transforma mágicamente en un mensaje claro y ordenado en tu chat de WhatsApp, listo para ser despachado.",
    image:
      "https://placehold.co/400x300/F0FDF4/166534?text=Screenshot:+Resumen+en+WhatsApp",
    spanFull: false,
    tall: false,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    icon: SlidersHorizontal,
    title: "Control total de tu negocio",
    description:
      "Cambia precios en segundos, oculta lo que ya no tienes y lanza promociones. Administrar tu negocio online nunca había sido tan fácil ni tan rápido.",
    image:
      "https://placehold.co/800x400/FFFFFF/475569?text=Screenshot:+Dashboard+de+M%C3%A9tricas+y+Gesti%C3%B3n",
    spanFull: true,
    tall: true,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
];

const plans = [
  {
    name: "Plan Básico",
    subtitle: "Para negocios en crecimiento activo.",
    price: "C$ 1,000",
    period: "/mes",
    footnote: "",
    features: [
      "Catálogo web y página de tienda",
      "Productos y categorías ilimitadas",
      "Carrito de compras integrado",
      "Enrutamiento de pedidos a WhatsApp",
      "Panel administrativo completo",
    ],
    cta: "Comenzar ahora",
    highlighted: false,
  },
  {
    name: "Plan Avanzado",
    subtitle: "Para operaciones de alto volumen.",
    price: "C$ 1,500",
    period: "/mes",
    footnote: "",
    features: [
      "Todo lo del plan Básico incluido",
      "Personalización adicional de marca",
      "Funciones premium de catálogo",
      "Preparado para futuras integraciones",
      "Soporte técnico prioritario",
    ],
    cta: "Elegir plan",
    highlighted: true,
  },
  {
    name: "Prueba Gratuita",
    subtitle: "Perfecto para conocer la plataforma.",
    price: "15 Días",
    period: "",
    footnote: "No requiere tarjeta de crédito",
    features: [
      "Acceso completo a todas las funciones",
      "Crea tu catálogo sin límites",
      "Recibe pedidos reales en WhatsApp",
    ],
    cta: "Comenzar gratis",
    highlighted: false,
  },
];

const footerColumns = [
  {
    title: "Producto",
    links: [
      { label: "Catálogo web", href: "#" },
      { label: "Pedidos WhatsApp", href: "#" },
      { label: "Panel administrativo", href: "#" },
      { label: "Precios y Planes", href: "#pricing" },
    ],
  },
  {
    title: "Casos de Uso",
    links: [
      { label: "Ropa y Moda", href: "#" },
      { label: "Cosméticos y Belleza", href: "#" },
      { label: "Ferreterías", href: "#" },
      { label: "Farmacias", href: "#" },
    ],
  },
  {
    title: "Compañía",
    links: [
      { label: "Sobre Nosotros", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Soporte técnico", href: "#" },
      { label: "Contacto", href: "#" },
    ],
  },
];
