import React, { useContext, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FaChevronDown } from 'react-icons/fa';
import * as Select from '@radix-ui/react-select';
import Avatar from '../Avatar';
import { ToastContext } from '../../context/ToastContext';
import { registerRequest } from '../../data/authentication'

export default function Register({ showLoginComponent }) {
    const { t } = useTranslation("auth");

    const [isLoading, setIsLoading] = useState(false);
    const { showCustomToast } = useContext(ToastContext);

    const {
        register,
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        defaultValues: {
            email: "",
            password: "",
            username: "",
        }
    });

    useEffect(() => {
        reset({
            username: "",
            email: "",
            password: "",
        });
    }, [t, reset]);

    const onSubmit = (data) => {
        setIsLoading(true);

        registerRequest({
            email: data.email,
            password: data.password,
            username: data.username,
        })
            .then(response => {
                if (response.status == 201) {
                    setIsLoading(false);
                    showCustomToast(t('register.toast-title'), t('register.success'));
                    showLoginComponent()
                    return
                }
                if (response.status == 409) {
                    showCustomToast(t('register.toast-title'), t('register.invalid'));
                    setIsLoading(false);
                }
                else {
                    showCustomToast(t('register.toast-title'), t('register.error'));
                    setIsLoading(false);
                }
            })
            .catch(err => {
                showCustomToast(t('register.toast-title'), t('register.error'));
                setIsLoading(false);
            });

    };

    return (
        <div className="w-full mx-auto bg-white overflow-hidden">
            <div className="h-32 bg-gradient-to-b from-sky-300 via-sky-200 to-white relative">
                <div className="absolute top-4 left-8">
                    <h1 className="text-gray-700 text-lg font-normal">{t('register.title')}</h1>
                    <h2 className="text-gray-700 text-3xl font-normal">
                        {t('register.name-one')} <span className="font-bold text-gray-900">{t('register.name-two')}</span>
                    </h2>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-4 -mt-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="flex w-full sm:max-w-20 justify-center">
                        <Avatar size={82} />
                    </div>

                    <div className="flex-1">
                        <div className="flex flex-col mb-3">
                            <input
                                type="text"
                                placeholder={t('inputs.username')}
                                {...register("username", { required: true })}
                                className={`w-80 px-3 py-2 bg-gradient-to-b from-white to-gray-50 border ${errors.username ? 'border-red-500' : 'border-gray-400'} rounded-sm shadow-inner focus:outline-none focus:border-blue-500 focus:shadow-[inset_0_1px_3px_rgba(0,0,0,0.2),0_0_0_2px_rgba(59,130,246,0.3)] text-gray-800 placeholder:text-gray-500 font-segoe`}
                            />
                            {errors.username && <p className="text-red-500 text-xs">Campo obrigatório</p>}
                        </div>

                        <div className="flex flex-col mb-3">
                            <input
                                type="email"
                                placeholder={t('inputs.email')}
                                {...register("email", { required: true })}
                                className={`w-80 px-3 py-2 bg-gradient-to-b from-white to-gray-50 border ${errors.email ? 'border-red-500' : 'border-gray-400'} rounded-sm shadow-inner focus:outline-none focus:border-blue-500 focus:shadow-[inset_0_1px_3px_rgba(0,0,0,0.2),0_0_0_2px_rgba(59,130,246,0.3)] text-gray-800 placeholder:text-gray-500 font-segoe`}
                            />
                            {errors.email && <p className="text-red-500 text-xs">Campo obrigatório</p>}
                        </div>

                        <div className="flex flex-col mb-3">
                            <input
                                type="password"
                                placeholder={t('inputs.password')}
                                {...register("password", { required: true })}
                                className={`w-80 px-3 py-2 bg-gradient-to-b from-white to-gray-50 border ${errors.password ? 'border-red-500' : 'border-gray-400'} rounded-sm shadow-inner focus:outline-none focus:border-blue-500 focus:shadow-[inset_0_1px_3px_rgba(0,0,0,0.2),0_0_0_2px_rgba(59,130,246,0.3)] text-gray-800 placeholder:text-gray-500 font-segoe`}
                            />
                            {errors.password && <p className="text-red-500 text-xs">Campo obrigatório</p>}
                        </div>

                        <div className="flex gap-2 mt-3 justify-left">
                            <button type="submit" className="default">{t('register.button-enter')}</button>
                            <button type="button">{t('register.button-cancel')}</button>
                        </div>

                        <div className="text-left mt-3">
                            <span className="text-xs text-gray-600">{t('register.login-title')} </span>
                            <a onClick={showLoginComponent} className="cursor-pointer text-xs hover:underline">{t('register.login-button')}</a>
                        </div>
                    </div>
                </div>
            </form >
        </div >
    );
}
