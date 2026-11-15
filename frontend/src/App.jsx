
import { useEffect, useState } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from './lib/supabase'
import Auth from './Auth'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function App() {
  const [activePage, setActivePage] = useState('Dashboard')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  // Authentication states
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false)

  // Check login session and listen for password recovery
  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session)
        setAuthLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveringPassword(true)
      }

      setSession(session)
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Attach the logged-in user's access token to API requests
  function getAuthConfig() {
    return {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  }

  const [formData, setFormData] = useState({
    company: '',
    role: '',
    date: '',
    status: 'Applied',
  })

  // Resume Analyzer states
  const [resumeText, setResumeText] = useState('')
  const [resumeJobDescription, setResumeJobDescription] = useState('')
  const [resumeAnalysis, setResumeAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [resumeError, setResumeError] = useState('')

  // Interview Generator states
  const [interviewRole, setInterviewRole] = useState('')
  const [interviewDescription, setInterviewDescription] = useState('')
  const [interviewQuestions, setInterviewQuestions] = useState('')
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  const [interviewError, setInterviewError] = useState('')

  // Fetch applications only after login
  useEffect(() => {
    async function fetchApplications() {
      if (!session || isRecoveringPassword) {
        setApplications([])
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const response = await axios.get(
          `${API_URL}/applications`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        )

        setApplications(response.data)
      } catch (error) {
        console.error('Error fetching applications:', error)
        alert(
          error.response?.data?.detail ||
          'Could not load applications. Please check the backend.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [session, isRecoveringPassword])

  // Logout
  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert('Could not log out. Please try again.')
      console.error('Logout error:', error)
      return
    }

    setApplications([])
    setActivePage('Dashboard')
    resetForm()
  }

  const menuItems = [
    'Dashboard',
    'My Applications',
    'Resume Analysis',
    'Interview Prep',
  ]

  const total = applications.length

  const shortlisted = applications.filter(
    app => app.status === 'Shortlisted'
  ).length

  const interviews = applications.filter(
    app => app.status === 'Interview'
  ).length

  const rejected = applications.filter(
    app => app.status === 'Rejected'
  ).length

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    })
  }

  // Add or update an application
  async function handleSubmit(event) {
    event.preventDefault()

    try {
      if (editingId !== null) {
        const response = await axios.put(
          `${API_URL}/applications/${editingId}`,
          formData,
          getAuthConfig()
        )

        if (!response.data.application) {
          alert('Application not found.')
          return
        }

        setApplications(current =>
          current.map(app =>
            app.id === editingId
              ? response.data.application
              : app
          )
        )
      } else {
        const response = await axios.post(
          `${API_URL}/applications`,
          formData,
          getAuthConfig()
        )

        setApplications(current => [
          ...current,
          response.data.application,
        ])
      }

      resetForm()
    } catch (error) {
      console.error('Error saving application:', error)

      alert(
        error.response?.data?.detail ||
        'Could not save application. Please try again.'
      )
    }
  }

  function resetForm() {
    setFormData({
      company: '',
      role: '',
      date: '',
      status: 'Applied',
    })

    setEditingId(null)
    setShowForm(false)
  }

  function handleEdit(app) {
    setFormData({
      company: app.company,
      role: app.role,
      date: app.date,
      status: app.status,
    })

    setEditingId(app.id)
    setShowForm(true)
    setActivePage('My Applications')
  }

  // Delete application
  async function handleDelete(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this application?'
    )

    if (!confirmed) return

    try {
      await axios.delete(
        `${API_URL}/applications/${id}`,
        getAuthConfig()
      )

      setApplications(current =>
        current.filter(app => app.id !== id)
      )
    } catch (error) {
      console.error('Error deleting application:', error)

      alert(
        error.response?.data?.detail ||
        'Could not delete application. Please try again.'
      )
    }
  }

  // AI Resume Analyzer
  async function handleResumeAnalysis(event) {
    event.preventDefault()

    setAnalyzing(true)
    setResumeAnalysis('')
    setResumeError('')

    try {
      const response = await axios.post(
        `${API_URL}/analyze-resume`,
        {
          resume_text: resumeText,
          job_description: resumeJobDescription,
        },
        getAuthConfig()
      )

      setResumeAnalysis(response.data.analysis)
    } catch (error) {
      console.error('Resume analysis error:', error)

      setResumeError(
        error.response?.data?.detail ||
        'Could not analyze resume. Please check the backend.'
      )
    } finally {
      setAnalyzing(false)
    }
  }

  // AI Interview Question Generator
  async function handleInterviewGeneration(event) {
    event.preventDefault()

    setGeneratingQuestions(true)
    setInterviewQuestions('')
    setInterviewError('')

    try {
      const response = await axios.post(
        `${API_URL}/generate-interview-questions`,
        {
          job_role: interviewRole,
          job_description: interviewDescription,
        },
        getAuthConfig()
      )

      setInterviewQuestions(response.data.interview_questions)
    } catch (error) {
      console.error('Interview generation error:', error)

      setInterviewError(
        error.response?.data?.detail ||
        'Could not generate interview questions. Please try again.'
      )
    } finally {
      setGeneratingQuestions(false)
    }
  }

  // Wait while checking authentication
  if (authLoading) {
    return (
      <p className="mt-4 text-center">
        Checking login...
      </p>
    )
  }

  // Show password reset screen after opening recovery link
  if (isRecoveringPassword) {
    return (
      <ResetPassword
        onBackToLogin={() => setIsRecoveringPassword(false)}
      />
    )
  }

  // Show login/signup when user is not logged in
  if (!session) {
    return <Auth />
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h3 className="brand">CareerTrack</h3>

        <p className="sidebar-label">MENU</p>

        {menuItems.map(item => (
          <button
            key={item}
            className={`menu-item ${activePage === item ? 'active' : ''}`}
            onClick={() => {
              setActivePage(item)
              resetForm()
            }}
          >
            {item}
          </button>
        ))}

        <div className="sidebar-footer">
          <p>AI-Powered Job Tracker</p>
          <small>Manage your career journey</small>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h4>{activePage}</h4>
            <p className="text-muted mb-0">
              Track your job search journey in one place.
            </p>
          </div>

          <div className="d-flex align-items-center gap-3">
            <span className="profile">
  {session?.user?.email?.charAt(0).toUpperCase() || 'U'}
</span>

            <button
              className="btn btn-outline-danger btn-sm"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        {loading ? (
          <p className="mt-4">Loading applications...</p>
        ) : (
          <>
            {/* Dashboard */}
            {activePage === 'Dashboard' && (
              <>
                <section className="welcome-section">
                  <h2>Welcome back!</h2>
                  <p>Here is an overview of your job applications.</p>
                </section>

                <section className="stats-grid">
                  <div className="stat-card">
                    <p>Total Applications</p>
                    <h2>{total}</h2>
                  </div>

                  <div className="stat-card">
                    <p>Shortlisted</p>
                    <h2>{shortlisted}</h2>
                  </div>

                  <div className="stat-card">
                    <p>Interviews</p>
                    <h2>{interviews}</h2>
                  </div>

                  <div className="stat-card">
                    <p>Rejected</p>
                    <h2>{rejected}</h2>
                  </div>
                </section>

                <section className="applications-section">
                  <div className="section-heading">
                    <h4>Recent Applications</h4>

                    <button
                      className="btn btn-primary"
                      onClick={() => setActivePage('My Applications')}
                    >
                      View All
                    </button>
                  </div>

                  <ApplicationTable
                    applications={applications.slice(-5).reverse()}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </section>
              </>
            )}

            {/* My Applications */}
            {activePage === 'My Applications' && (
              <section className="applications-section">
                <div className="section-heading">
                  <h4>All Job Applications</h4>

                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (showForm) {
                        resetForm()
                      } else {
                        setShowForm(true)
                      }
                    }}
                  >
                    {showForm ? 'Close Form' : '+ Add Application'}
                  </button>
                </div>

                {showForm && (
                  <form
                    onSubmit={handleSubmit}
                    className="application-form"
                  >
                    <h5>
                      {editingId !== null
                        ? 'Edit Application'
                        : 'Add New Application'}
                    </h5>

                    <div className="mb-3">
                      <label className="form-label">
                        Company Name
                      </label>

                      <input
                        className="form-control"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="Enter company name"
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">
                        Job Role
                      </label>

                      <input
                        className="form-control"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        placeholder="Enter job role"
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">
                        Application Date
                      </label>

                      <input
                        type="date"
                        className="form-control"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">
                        Application Status
                      </label>

                      <select
                        className="form-select"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                      >
                        <option>Applied</option>
                        <option>Interview</option>
                        <option>Shortlisted</option>
                        <option>Rejected</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-success me-2"
                    >
                      {editingId !== null
                        ? 'Update Application'
                        : 'Save Application'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={resetForm}
                    >
                      Cancel
                    </button>
                  </form>
                )}

                <ApplicationTable
                  applications={[...applications].reverse()}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </section>
            )}

            {/* Resume Analysis */}
            {activePage === 'Resume Analysis' && (
              <section className="feature-card">
                <h4>AI Resume Analysis</h4>

                <p>
                  Compare your resume with a job description
                  and discover your skill gaps.
                </p>

                <form onSubmit={handleResumeAnalysis}>
                  <div className="mb-3">
                    <label className="form-label">
                      Resume Text
                    </label>

                    <textarea
                      className="form-control"
                      rows="8"
                      value={resumeText}
                      onChange={event => setResumeText(event.target.value)}
                      placeholder="Paste your resume content here..."
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Job Description
                    </label>

                    <textarea
                      className="form-control"
                      rows="6"
                      value={resumeJobDescription}
                      onChange={event =>
                        setResumeJobDescription(event.target.value)
                      }
                      placeholder="Paste the job description here..."
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={analyzing}
                  >
                    {analyzing
                      ? 'Analyzing Resume...'
                      : 'Analyze Resume'}
                  </button>
                </form>

                {resumeError && (
                  <div className="alert alert-danger mt-4">
                    {resumeError}
                  </div>
                )}

                {analyzing && (
                  <p className="mt-3">
                    AI is analyzing your resume. Please wait...
                  </p>
                )}

                {resumeAnalysis && (
                  <div className="mt-4 p-3 border rounded">
                    <h5>Resume Analysis Results</h5>

                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {resumeAnalysis}
                    </ReactMarkdown>
                  </div>
                )}
              </section>
            )}

            {/* Interview Preparation */}
            {activePage === 'Interview Prep' && (
              <section className="feature-card">
                <h4>AI Interview Preparation</h4>

                <p>
                  Generate technical, coding and HR interview
                  questions based on your target job.
                </p>

                <form onSubmit={handleInterviewGeneration}>
                  <div className="mb-3">
                    <label className="form-label">
                      Job Role
                    </label>

                    <input
                      className="form-control"
                      value={interviewRole}
                      onChange={event =>
                        setInterviewRole(event.target.value)
                      }
                      placeholder="Example: Junior Python Developer"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Job Description
                    </label>

                    <textarea
                      className="form-control"
                      rows="7"
                      value={interviewDescription}
                      onChange={event =>
                        setInterviewDescription(event.target.value)
                      }
                      placeholder="Paste the job description here..."
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={generatingQuestions}
                  >
                    {generatingQuestions
                      ? 'Generating Questions...'
                      : 'Generate Interview Questions'}
                  </button>
                </form>

                {interviewError && (
                  <div className="alert alert-danger mt-4">
                    {interviewError}
                  </div>
                )}

                {generatingQuestions && (
                  <p className="mt-3">
                    AI is preparing your interview questions. Please wait...
                  </p>
                )}

                {interviewQuestions && (
                  <div className="mt-4 p-3 border rounded">
                    <h5>Generated Interview Questions</h5>

                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {interviewQuestions}
                    </ReactMarkdown>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

// Password reset component
function ResetPassword({ onBackToLogin }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handlePasswordUpdate(event) {
    event.preventDefault()

    setMessage('')
    setError('')

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) throw error

      setMessage(
        'Password updated successfully! You can now log in with your new password.'
      )

      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        console.error('Sign out after password update:', signOutError)
      }
    } catch (err) {
      setError(err.message || 'Unable to update password.')
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

        <h4>Set New Password</h4>

        <p>Enter and confirm your new password.</p>

        <form onSubmit={handlePasswordUpdate}>
          <label>New Password</label>

          <input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            placeholder="Enter new password"
            minLength={8}
            required
            disabled={!!message}
          />

          <label>Confirm New Password</label>

          <input
            type="password"
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            minLength={8}
            required
            disabled={!!message}
          />

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

          <button type="submit" disabled={loading || !!message}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        {message && (
          <div className="auth-toggle">
            <button type="button" onClick={onBackToLogin}>
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Application table component
function ApplicationTable({ applications, onEdit, onDelete }) {
  return (
    <div className="table-responsive">
      <table className="table align-middle">
        <thead>
          <tr>
            <th>Company</th>
            <th>Job Role</th>
            <th>Applied Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {applications.map(app => (
            <tr key={app.id}>
              <td>{app.company}</td>
              <td>{app.role}</td>
              <td>{app.date}</td>

              <td>
                <span
                  className={`status-badge ${app.status.toLowerCase()}`}
                >
                  {app.status}
                </span>
              </td>

              <td>
                <button
                  className="btn btn-sm btn-outline-primary me-2"
                  onClick={() => onEdit(app)}
                >
                  Edit
                </button>

                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => onDelete(app.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}

          {applications.length === 0 && (
            <tr>
              <td colSpan="5" className="text-center">
                No applications found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default App
