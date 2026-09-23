import React, { useContext, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FaChevronDown } from 'react-icons/fa';
import * as Select from '@radix-ui/react-select';
import Avatar from '../Avatar';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import { loginRequest } from '../../data/authentication'
import { ChatContext } from '../../context/ChatContext';
import statusFrames from '../../imports/statusFrames';

export default function Login({ showRegisterComponent, showResetComponent }) {
    const { t } = useTranslation("auth");

    const [isLoading, setIsLoading] = useState(false);
    const { login, changeStatus } = useContext(AuthContext);
    const { connectOnSocket } = useContext(ChatContext);
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
            rememberMe: false,
            autoSignIn: false,
            status: "online",
        }
    });

    useEffect(() => {
        reset({
            email: "",
            password: "",
            rememberMe: false,
            autoSignIn: false,
            status: "online",
        });
    }, [t, reset]);

    const onSubmit = (data) => {
        setIsLoading(true);

        loginRequest({
            email: data.email,
            password: data.password,
        })
            .then(response => {
                if (response.status == 201) {
                    const userStatus = response.data.user.status;
                    const selectedStatus = data.status;

                    login(response.data, data);
                    connectOnSocket();

                    // Se o status atual no banco for diferente do selecionado no login,
                    // chamamos o `changeStatus` para atualizá-lo.
                    if (userStatus !== selectedStatus) {
                        changeStatus(selectedStatus);
                    }
                    setIsLoading(false);
                    showCustomToast(t('login.toast-title'), t('login.success'));
                    return
                }
                if (response.status == 401 || response.status == 404) {
                    showCustomToast(t('login.toast-title'), t('login.invalid'));
                    setIsLoading(false);
                }
                else {
                    showCustomToast(t('login.toast-title'), t('login.error'));
                    setIsLoading(false);
                }
            })
            .catch(err => {
                showCustomToast(t('login.toast-title'), t('login.error'));
                setIsLoading(false);
            });

    };

    const options = [
        { value: 'online', label: t('status.online'), image: statusFrames.onlineDot },
        { value: 'busy', label: t('status.busy'), image: statusFrames.busyDot },
        { value: 'away', label: t('status.away'), image: statusFrames.awayDot },
        {
            value: 'offline',
            label: t('status.offline'),
            image: statusFrames.offlineDot,
        },
    ]

    return (
        <div
            className="w-full mx-auto bg-no-repeat bg-[length:100%_100px]"
            style={{ backgroundImage: 'url("/assets/background/background.jpg")' }}
        >
            <div className="h-32 relative">
                <div className="absolute top-4 left-8">
                    <h1 className="text-gray-700 text-lg font-normal">{t('login.title')}</h1>
                    <h2 className="text-gray-700 text-3xl font-normal">
                        {t('login.name-one')} <span className="font-bold text-gray-900">{t('login.name-two')}</span>
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

                        <div className="text-left">
                            <a className="cursor-pointer text-xs hover:underline">{t('login.forgot')}</a>
                        </div>

                        <div className="flex items-center gap-2 text-sm mt-3 mb-1.5">
                            <span className="text-gray-700">{t('login.session')}</span>
                            <Controller
                                name="status"
                                control={control}
                                render={({ field }) => {
                                    return (
                                        <Select.Root value={field.value} onValueChange={field.onChange}>
                                            <Select.Trigger
                                                className="px-1 py-1 rounded-md text-sm text-gray-800 flex items-center justify-between min-w-[120px]"
                                                style={{
                                                    all: 'unset',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: 'white',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <Select.Value asChild>
                                                    <div className="flex items-center gap-1.5">
                                                        {(() => {
                                                            const current = options.find(o => o.value === field.value);
                                                            return (
                                                                <>
                                                                    <img src={current?.image} alt="" className="w-2.5 h-2.5 rounded-sm border-2 border-gray-300" />
                                                                    <span>{current?.label}</span>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </Select.Value>
                                                <Select.Icon>
                                                    <FaChevronDown className="text-gray-400" />
                                                </Select.Icon>
                                            </Select.Trigger>

                                            <Select.Portal>
                                                <Select.Content className="ml-4 bg-white shadow-md">
                                                    <Select.Viewport>
                                                        {options.map(({ value, label, image }) => (
                                                            <Select.Item
                                                                key={value}
                                                                value={value}
                                                                className="text-sm px-2 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer"
                                                            >
                                                                <img src={image} alt="" className="w-2.5 h-2.5 rounded-sm border-2 border-gray-300" />
                                                                <Select.ItemText>{label}</Select.ItemText>
                                                            </Select.Item>
                                                        ))}
                                                    </Select.Viewport>
                                                </Select.Content>
                                            </Select.Portal>
                                        </Select.Root>
                                    );
                                }}
                            />

                        </div>

                        <div className="space-y-2">
                            <div className="field-row">
                                <input type="checkbox" id="reminder" {...register("rememberMe")} />
                                <label htmlFor="reminder">{t('login.record')}</label>
                            </div>
                            <div className="field-row">
                                <input type="checkbox" id="session" {...register("autoSignIn")} />
                                <label htmlFor="session">{t('login.enter')}</label>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-5 justify-left">
                            <button type="submit" className="default">{t('login.button-enter')}</button>
                            <button type="button">{t('login.button-cancel')}</button>
                        </div>

                        <div className="text-left mt-3">
                            <span className="text-xs text-gray-600">{t('login.register-title')} </span>
                            <a onClick={showRegisterComponent} className="cursor-pointer text-xs hover:underline">{t('login.register-button')}</a>
                        </div>
                    </div>
                </div>
            </form >
        </div >
    );

};