import React, { useState } from 'react';
import type { ShippingAddress } from '../../types';

interface Props {
    value: Partial<ShippingAddress>;
    onChange: (addr: Partial<ShippingAddress>) => void;
    title?: string;
}

export default function ShippingAddressForm({ value, onChange, title = 'Адрес доставки' }: Props) {
    const [errors, setErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});

    function set(field: keyof ShippingAddress, v: string) {
        onChange({ ...value, [field]: v });
        if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
    }

    const field = (
        label: string,
        key: keyof ShippingAddress,
        placeholder: string,
        required = true,
    ) => (
        <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-text-secondary)]">
                {label}{required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            <input
                type="text"
                value={(value[key] as string) ?? ''}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            {errors[key] && <span className="text-xs text-red-400">{errors[key]}</span>}
        </div>
    );

    return (
        <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
            {field('ФИО получателя', 'fullName', 'Иванов Иван Иванович')}
            {field('Телефон', 'phone', '+7 (900) 000-00-00')}
            <div className="grid grid-cols-2 gap-2">
                {field('Город', 'city', 'Москва')}
                {field('Индекс', 'zipCode', '101000')}
            </div>
            {field('Улица', 'street', 'Тверская ул.')}
            <div className="grid grid-cols-2 gap-2">
                {field('Дом', 'house', '12')}
                {field('Квартира', 'apartment', '34', false)}
            </div>
            {field('Комментарий курьеру', 'comment', 'Код домофона: 123', false)}
        </div>
    );
}

export function validateAddress(addr: Partial<ShippingAddress>): boolean {
    const required: (keyof ShippingAddress)[] = ['fullName', 'phone', 'city', 'street', 'house', 'zipCode'];
    return required.every(k => !!addr[k]?.trim());
}
