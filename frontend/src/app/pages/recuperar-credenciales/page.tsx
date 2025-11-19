"use client";
import React, { useState, useRef } from "react";
import Header from "@/app/components/Header";
import { useRouter } from "next/navigation";
import { EnviarCodigoAlMail, VerificarCodigo, ActualizarPassword } from "@/app/api/recuperarContraseña";

const RecuperarCredencialesPage = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMsg, setModalMsg] = useState("");
    const [modalType, setModalType] = useState<"error"|"success">("error");
    const codeRefs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null)
    ];
    const router = useRouter();

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
    // setError eliminado
        const res = await EnviarCodigoAlMail(email);
        setLoading(false);
        if (res.success) {
            setStep(2);
        } else {
            setModalMsg(res.error || "No se pudo enviar el código. Intenta nuevamente.");
            setModalType("error");
            setModalOpen(true);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
    // setError eliminado
        const res = await VerificarCodigo(email, code.join(""));
        setLoading(false);
        if (res.success) {
            // setCodeOk eliminado
            setStep(3);
        } else {
            setModalMsg(res.error || "Código incorrecto. Intenta nuevamente.");
            setModalType("error");
            setModalOpen(true);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== repeatPassword) {
            setModalMsg("Las contraseñas no coinciden.");
            setModalType("error");
            setModalOpen(true);
            return;
        }
        setLoading(true);
    // setError eliminado
        const res = await ActualizarPassword(email, newPassword);
        setLoading(false);
        if (res.success) {
            setModalMsg("Contraseña actualizada con éxito.");
            setModalType("success");
            setModalOpen(true);
            setTimeout(() => router.push("/"), 1500);
        } else {
            setModalMsg(res.error || "No se pudo actualizar la contraseña. Intenta nuevamente.");
            setModalType("error");
            setModalOpen(true);
        }
    };

    const handleCodeChange = (idx: number, value: string) => {
        if (!/^[0-9]?$/.test(value)) return;
        const newCode = [...code];
        newCode[idx] = value;
        setCode(newCode);
        if (value && idx < 5) {
            codeRefs[idx + 1].current?.focus();
        }
        if (!value && idx > 0) {
            codeRefs[idx - 1].current?.focus();
        }
    };

        return (
            <div>
                <Header />
                <div className="min-h-screen bg-neutral-light flex flex-col items-center justify-center px-4">
                    <div className="w-full max-w-sm bg-white rounded-lg shadow-md p-6 mt-6">
                        <h1 className="text-2xl font-bold text-center mb-4 text-primary">Recuperar Credenciales</h1>
                        {step === 1 && (
                            <form onSubmit={handleSendCode} className="flex flex-col gap-4">
                                <label className="text-sm font-medium">Correo electrónico</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="rounded border px-3 py-2 w-full focus:outline-primary"
                                    placeholder="tu@email.com"
                                />
                                <button type="submit" disabled={loading} className="bg-primary text-white rounded py-2 font-semibold mt-2 hover:opacity-90 transition">
                                    {loading ? "Enviando..." : "Enviar código"}
                                </button>
                            </form>
                        )}
                        {step === 2 && (
                            <form onSubmit={handleVerifyCode} className="flex flex-col gap-4 items-center">
                                <label className="text-sm font-medium text-center">Ingresa el código recibido</label>
                                <div className="flex gap-2 justify-center mb-2">
                                    {code.map((c, idx) => (
                                        <input
                                            key={idx}
                                            ref={codeRefs[idx]}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={c}
                                            onChange={e => handleCodeChange(idx, e.target.value)}
                                            className="w-10 h-10 text-center text-xl border rounded focus:outline-primary"
                                        />
                                    ))}
                                </div>
                                <button type="submit" disabled={loading || code.some(c => !c)} className="bg-primary text-white rounded py-2 font-semibold w-full hover:opacity-90 transition">
                                    {loading ? "Verificando..." : "Verificar código"}
                                </button>
                            </form>
                        )}
                        {step === 3 && (
                            <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
                                <label className="text-sm font-medium">Nueva contraseña</label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="rounded border px-3 py-2 w-full focus:outline-primary"
                                    placeholder="Nueva contraseña"
                                />
                                <label className="text-sm font-medium">Repetir nueva contraseña</label>
                                <input
                                    type="password"
                                    required
                                    value={repeatPassword}
                                    onChange={e => setRepeatPassword(e.target.value)}
                                    className="rounded border px-3 py-2 w-full focus:outline-primary"
                                    placeholder="Repetir nueva contraseña"
                                />
                                <button type="submit" disabled={loading} className="bg-success text-white rounded py-2 font-semibold mt-2 hover:opacity-90 transition">
                                    {loading ? "Actualizando..." : "Actualizar contraseña"}
                                </button>
                            </form>
                        )}
                    </div>
                    {/* Modal */}
                    {modalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                            <div className={`rounded-lg p-6 shadow-lg w-80 text-center ${modalType === "error" ? "bg-red-50 border border-red-300" : "bg-green-50 border border-green-300"}`}>
                                <h3 className={`text-lg font-bold mb-2 ${modalType === "error" ? "text-red-600" : "text-green-600"}`}>{modalType === "error" ? "Error" : "Éxito"}</h3>
                                <p className="mb-4 text-sm">{modalMsg}</p>
                                <button onClick={() => setModalOpen(false)} className={`px-4 py-2 rounded font-semibold ${modalType === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"} hover:opacity-90 transition`}>
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
};

export default RecuperarCredencialesPage;