import LoginForm from '@/features/auth/components/LoginForm';
import GLogin from '@/features/auth/components/GLogin';

const LoginPage = () => {
  return (
    <div className="w-[400px] mx-auto my-20 space-y-6">
      <LoginForm />
      
      <div className="relative flex items-center justify-center">
        <div className="border-t border-gray-300 w-full" />
        <span className="bg-white px-3 text-sm text-gray-500 absolute">OR</span>
      </div>

      <GLogin />
    </div>
  );
};

export default LoginPage;