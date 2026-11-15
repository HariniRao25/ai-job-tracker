
import { useState } from 'react'
import { supabase } from './lib/supabase'
import './Auth.css'

function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [isForgotPassword, setIsForgotPassword] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    setLoading(true)
    setMessage('')
    setError('')

    try {
      // Password recovery
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: `${window.location.origin}/`,
          }
        )

        if (error) throw error

        setMessage(
          'Password reset email sent. Please check your inbox and spam folder.'
        )
      }

      // Login
      else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
      }

      // Signup
      else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        if (!data.session) {
          setMessage(
            'Registration successful! Please check your email to confirm your account, then log in.'
          )
        } else {
          setMessage('Account created successfully!')
        }
      }

    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function switchMode() {
    setIsLogin(!isLogin)
    setIsForgotPassword(false)
    setMessage('')
    setError('')
    setPassword('')
  }

  return (
    <div className="auth-container">
      <div className="auth-card">

        <h2>CareerTrack</h2>

        <p className="auth-subtitle">
          Your AI-powered career companion
        </p>

        <h4>
          {isForgotPassword
            ? 'Reset Your Password'
            : isLogin
              ? 'Welcome Back!'
              : 'Create Your Account'}
        </h4>

        <p>
          {isForgotPassword
            ? 'Enter your registered email address to receive a password reset link.'
            : isLogin
              ? 'Log in to manage your job applications.'
              : 'Sign up to start tracking your career journey.'}
        </p>

        <form onSubmit={handleSubmit}>

          <label>Email Address</label>

          <input
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="Enter your email"
            required
          />

          {!isForgotPassword && (
            <>
              <label>Password</label>

              <input
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="Enter your password"
                minLength={8}
                required
              />
            </>
          )}

          {isLogin && !isForgotPassword && (
            <div className="text-end mt-2 mb-3">
              <button
                type="button"
                className="btn btn-link p-0"
                onClick={() => {
                  setIsForgotPassword(true)
                  setMessage('')
                  setError('')
                }}
              >
                Forgot Password?
              </button>
            </div>
          )}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {message && (
            <div className="auth-message">
              {message}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading
              ? 'Please wait...'
              : isForgotPassword
                ? 'Send Reset Link'
                : isLogin
                  ? 'Login'
                  : 'Create Account'}
          </button>

        </form>

        <div className="auth-toggle">

          {isForgotPassword ? (
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false)
                setMessage('')
                setError('')
              }}
            >
              Back to Login
            </button>
          ) : (
            <>
              {isLogin
                ? "Don't have an account?"
                : 'Already have an account?'}

              <button
                type="button"
                onClick={switchMode}
              >
                {isLogin ? 'Sign Up' : 'Login'}
              </button>
            </>
          )}

        </div>

      </div>
    </div>
  )
}

export default Auth
