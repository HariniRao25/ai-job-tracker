
import { useState } from 'react'
import { supabase } from './lib/supabase'
import './Auth.css'

function Auth() {
  const [isLogin, setIsLogin] = useState(true)
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
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) throw error

      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password
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

  return (
    <div className="auth-container">
      <div className="auth-card">

        <h2>CareerTrack</h2>

        <p className="auth-subtitle">
          Your AI-powered career companion
        </p>

        <h4>
          {isLogin ? 'Welcome Back!' : 'Create Your Account'}
        </h4>

        <p>
          {isLogin
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

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            placeholder="Enter your password"
            minLength={8}
            required
          />

          {error && (
            <div className="auth-error">{error}</div>
          )}

          {message && (
            <div className="auth-message">{message}</div>
          )}

          <button type="submit" disabled={loading}>
            {loading
              ? 'Please wait...'
              : isLogin
                ? 'Login'
                : 'Create Account'}
          </button>

        </form>

        <div className="auth-toggle">
          {isLogin
            ? "Don't have an account?"
            : 'Already have an account?'}

          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin)
              setMessage('')
              setError('')
            }}
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </div>

      </div>
    </div>
  )
}

export default Auth
