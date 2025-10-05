"use client";
import React, { useState, useRef } from "react";
import Header from "@/app/components/Header";
import { useRouter } from "next/navigation";

const RecuperarCredencialesPage = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [code, setCode] = useState(["", "", "", ""]);
    const [codeOk, setCodeOk] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const router = useRouter();
    const codeRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        const res = await fetch("/api/recuperarContraseña", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "sendCode", email }),
        });
        setLoading(false);
        if (res.ok) {
            setStep(2);
        } else {
            setError("No se pudo enviar el código. Intenta nuevamente.");
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        const res = await fetch("/api/recuperarContraseña", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "verifyCode", email, code: code.join("") }),
        });
        setLoading(false);
        if (res.ok) {
            setCodeOk(true);
            setStep(3);
        } else {
            setError("Código incorrecto. Intenta nuevamente.");
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        const res = await fetch("/api/recuperarContraseña", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "updatePassword", email, code: code.join("") , newPassword }),
        });
        setLoading(false);
        if (res.ok) {
            router.push("/");
        } else {
            setError("No se pudo actualizar la contraseña. Intenta nuevamente.");
        }
    };

    const handleCodeChange = (idx: number, value: string) => {
        if (!/^[0-9]?$/.test(value)) return;
        const newCode = [...code];
        newCode[idx] = value;
        setCode(newCode);
        if (value && idx < 3) {
            codeRefs[idx + 1].current?.focus();
        }
        if (!value && idx > 0) {
            codeRefs[idx - 1].current?.focus();
        }
    };

    return (<div>
                    <Header />

        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
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
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
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
                                    className="w-12 h-12 text-center text-xl border rounded focus:outline-primary"
                                />
                            ))}
                        </div>
                        <button type="submit" disabled={loading || code.some(c => !c)} className="bg-primary text-white rounded py-2 font-semibold w-full hover:opacity-90 transition">
                            {loading ? "Verificando..." : "Verificar código"}
                        </button>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
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
                        <button type="submit" disabled={loading} className="bg-success text-white rounded py-2 font-semibold mt-2 hover:opacity-90 transition">
                            {loading ? "Actualizando..." : "Actualizar contraseña"}
                        </button>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    </form>
                )}
            </div>
        </div>
            </div>

    );
};

export default RecuperarCredencialesPage;