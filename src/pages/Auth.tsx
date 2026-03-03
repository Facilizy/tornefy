import { useLocation } from "react-router-dom";
import { useAuthLogic } from "@/hooks/useAuthLogic";
import { useAuthRedirects } from "@/hooks/useAuthRedirects";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { SignupWizard } from "@/components/auth/SignupWizard";

const Auth = () => {
  const location = useLocation();
  const isOAuthCompletion = new URLSearchParams(location.search).get("complete") === "1";

  // Redirects Logic
  useAuthRedirects(isOAuthCompletion);

  // Core Logic
  const {
    isLogin,
    loading,
    formData,
    setFormData,
    forgotPassword,
    setForgotPassword,
    acceptedTerms,
    setAcceptedTerms,
    currentStep,
    showLoginPassword,
    setShowLoginPassword,
    showSignupPassword,
    setShowSignupPassword,
    signupAwaitingEmail,
    emailCtaClicked,
    signupEmail,
    setAuthMode,
    goToNextStep,
    goToPrevStep,
    handleAuth,
    handleOAuthLogin,
    handleOpenEmailProvider,
    getWebmailUrlForEmail,
  } = useAuthLogic(isOAuthCompletion);

  const title = forgotPassword ? "Recuperar Senha" : isLogin ? "Entrar" : "Criar Conta";

  return (
    <AuthLayout title={title}>
      {(isLogin || forgotPassword) && (
        <>
          {forgotPassword ? (
            <ForgotPasswordForm
              formData={formData}
              setFormData={setFormData}
              loading={loading}
              onSubmit={handleAuth}
            />
          ) : (
            <LoginForm
              formData={formData}
              setFormData={setFormData}
              showPassword={showLoginPassword}
              setShowPassword={setShowLoginPassword}
              loading={loading}
              handleOAuthLogin={handleOAuthLogin}
              onSubmit={handleAuth}
            />
          )}
        </>
      )}

      {/* Signup Wizard */}
      {!isLogin && !forgotPassword && (
        <SignupWizard
          currentStep={currentStep}
          formData={formData}
          setFormData={setFormData}
          loading={loading}
          showPassword={showSignupPassword}
          setShowPassword={setShowSignupPassword}
          acceptedTerms={acceptedTerms}
          setAcceptedTerms={setAcceptedTerms}
          signupAwaitingEmail={signupAwaitingEmail}
          signupEmail={signupEmail}
          emailCtaClicked={emailCtaClicked}
          goToNextStep={goToNextStep}
          goToPrevStep={goToPrevStep}
          onSubmit={handleAuth}
          handleOpenEmailProvider={handleOpenEmailProvider}
          getWebmailUrlForEmail={getWebmailUrlForEmail}
          onSwitchToLogin={() => setAuthMode("login")}
        />
      )}

      <div className="mt-6 space-y-3 text-center">
        {isLogin && !forgotPassword && (
          <button
            type="button"
            onClick={() => setForgotPassword(true)}
            className="text-sm text-primary hover:text-primary/80 transition-colors block w-full"
          >
            Esqueci minha senha
          </button>
        )}

        {!forgotPassword && (
          <button
            type="button"
            onClick={() => setAuthMode(isLogin ? "signup" : "login")}
            className="text-sm text-primary hover:text-primary/80 transition-colors block w-full"
          >
            {isLogin ? "Não tem conta? Criar conta" : "Já tem conta? Fazer login"}
          </button>
        )}

        {forgotPassword && (
          <button
            type="button"
            onClick={() => setForgotPassword(false)}
            className="text-sm text-primary hover:text-primary/80 transition-colors block w-full"
          >
            Voltar ao login
          </button>
        )}
      </div>
    </AuthLayout>
  );
};

export default Auth;
