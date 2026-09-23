import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MdOutlineAlternateEmail } from "react-icons/md";
import { FaCode } from "react-icons/fa6";
import { RiLockPasswordLine } from "react-icons/ri";

export default function ResetPassword({ setShowLogin }) {
    const { t } = useTranslation("auth");

    const [step, setStep] = useState("email"); // email | code | password

    const [loading, setLoading] = useState(false);

    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        reset,
        formState: { errors }
    } = useForm();

    const onSubmitEmail = ({ email }) => {
        setLoading(true);

        // Aqui você deve chamar sua API para enviar o código para o e-mail
        // await api.sendCodeToEmail(email, code)

        setTimeout(() => {
            setLoading(false);
            setStep("code");
        }, 1000);
    };

    const onSubmitCode = ({ code }) => {
        if (code === generatedCode) {
            setStep("password");
        } else {
            alert("Código inválido.");
        }
    };

    const onSubmitPassword = ({ newPassword }) => {
        console.log("Nova senha:", newPassword);
        // Aqui você faz a chamada para atualizar a senha no backend
        alert("Senha alterada com sucesso!");
        reset();
        setStep("email");
    };

    const cancelAll = () => {
        reset();
        setStep("email");
        setGeneratedCode("");
    };

    return (
        <div className="w-full max-w-sm mx-auto mt-10 bg-white shadow-lg p-6 rounded-md">
            <h2 className="text-xl font-semibold text-center mb-4">Redefinir Senha</h2>

            {step === "email" && (
                <form onSubmit={handleSubmit(onSubmitEmail)}>
                    <label className="block mb-2 text-sm font-medium">E-mail</label>
                    <div className="flex items-center bg-gray-100 rounded px-2 mb-3">
                        <MdOutlineAlternateEmail className="text-gray-500" />
                        <input
                            type="email"
                            placeholder="seu@email.com"
                            className="flex-1 p-2 bg-gray-100 outline-none"
                            {...register("email", { required: "Informe o e-mail" })}
                        />
                    </div>
                    {errors.email && <p className="text-red-500 text-sm mb-2">{errors.email.message}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md"
                    >
                        {loading ? <CircularProgress size={20} color="inherit" /> : "Enviar código"}
                    </button>
                </form>
            )}

            {step === "code" && (
                <form onSubmit={handleSubmit(onSubmitCode)}>
                    <label className="block mb-2 text-sm font-medium">Código de verificação</label>
                    <div className="flex items-center bg-gray-100 rounded px-2 mb-3">
                        <FaCode className="text-gray-500" />
                        <input
                            type="text"
                            placeholder="123456"
                            className="flex-1 p-2 bg-gray-100 outline-none"
                            {...register("code", {
                                required: "Informe o código",
                                pattern: { value: /^[0-9]{6}$/, message: "Código inválido" }
                            })}
                        />
                    </div>
                    {errors.code && <p className="text-red-500 text-sm mb-2">{errors.code.message}</p>}

                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md">
                            Verificar
                        </button>
                        <button type="button" onClick={cancelAll} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-md">
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            {step === "password" && (
                <form onSubmit={handleSubmit(onSubmitPassword)}>
                    <label className="block mb-2 text-sm font-medium">Nova senha</label>
                    <div className="flex items-center bg-gray-100 rounded px-2 mb-3">
                        <RiLockPasswordLine className="text-gray-500" />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Nova senha"
                            className="flex-1 p-2 bg-gray-100 outline-none"
                            {...register("newPassword", {
                                required: "Informe a nova senha",
                                minLength: { value: 6, message: "Mínimo 6 caracteres" }
                            })}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </button>
                    </div>
                    {errors.newPassword && <p className="text-red-500 text-sm mb-2">{errors.newPassword.message}</p>}

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md">
                        Redefinir senha
                    </button>
                </form>
            )}
        </div>
    );
}
