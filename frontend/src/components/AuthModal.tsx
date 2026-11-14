import React, { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { SegmentedControl } from './SegmentedControl';
import { triggerHaptic } from '../utils/applePhysics';
import { User, Lock, Mail } from 'lucide-react';
import { UserProfile } from '../types/auth';
import axios from 'axios';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess
}) => {
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    triggerHaptic('medium');

    try {
      if (tab === 'LOGIN') {
        const res = await axios.post('/api/v1/auth/login', {
          username: username.trim(),
          password
        });
        triggerHaptic('success');
        onAuthSuccess(res.data.user, res.data.access_token);
        onClose();
      } else {
        const res = await axios.post('/api/v1/auth/register', {
          username: username.trim(),
          email: email.trim() || `${username.trim().toLowerCase()}@recomp.local`,
          password,
          dietary_mode: username.toLowerCase() === 'gorokhova' ? 'DORMITORY' : 'FREE'
        });
        triggerHaptic('success');
        onAuthSuccess(res.data.user, res.data.access_token);
        onClose();
      }
    } catch (err: any) {
      triggerHaptic('error');
      const msg = err.response?.data?.detail || "Ошибка авторизации. Проверьте логин и пароль.";
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={tab === 'LOGIN' ? "Вход в аккаунт" : "Регистрация"}
      subtitle="Доступ к личному дневнику, тренировкам и меню"
    >
      <div className="space-y-4 py-2">
        {/* Apple Segmented Control */}
        <SegmentedControl
          options={[
            { value: 'LOGIN', label: 'Вход' },
            { value: 'REGISTER', label: 'Регистрация' }
          ]}
          value={tab}
          onChange={(val) => {
            setError(null);
            setTab(val as 'LOGIN' | 'REGISTER');
          }}
        />

        {error && (
          <div className="p-3 rounded-xl bg-apple-red/10 text-apple-red text-xs font-medium border border-apple-red/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-apple-gray-1 uppercase tracking-wider block ml-1 mb-1">
              Логин
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 w-4 h-4 text-apple-gray-1 pointer-events-none" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Имя пользователя"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E] text-sm text-[#1C1C1E] dark:text-white placeholder-apple-gray-1 outline-none focus:ring-2 focus:ring-apple-blue transition-all"
              />
            </div>
          </div>

          {tab === 'REGISTER' && (
            <div>
              <label className="text-xs font-semibold text-apple-gray-1 uppercase tracking-wider block ml-1 mb-1">
                Email
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-apple-gray-1 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E] text-sm text-[#1C1C1E] dark:text-white placeholder-apple-gray-1 outline-none focus:ring-2 focus:ring-apple-blue transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-apple-gray-1 uppercase tracking-wider block ml-1 mb-1">
              Пароль
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-apple-gray-1 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-apple-gray-6 dark:bg-[#2C2C2E] text-sm text-[#1C1C1E] dark:text-white placeholder-apple-gray-1 outline-none focus:ring-2 focus:ring-apple-blue transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-apple-blue text-white rounded-xl text-sm font-bold shadow-lg shadow-apple-blue/30 apple-pressable flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <span>{tab === 'LOGIN' ? 'Войти' : 'Зарегистрироваться'}</span>
            )}
          </button>
        </form>
      </div>
    </BottomSheet>
  );
};
