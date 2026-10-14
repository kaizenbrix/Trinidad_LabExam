import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import './App.css'

const API_URL = 'http://localhost:3001/api'
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High']
const STATUS_OPTIONS = ['Open', 'In Progress', 'Resolved', 'Closed']

const formatDate = (value) =>
  new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const getDefaultForm = () => ({
  requesterName: '',
  category: 'Hardware',
  priority: 'Medium',
  status: 'Open',
  subject: '',
  description: '',
})

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(localStorage.getItem('helpdesk-auth')),
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/tickets" replace />
            ) : (
              <LoginPage onLogin={() => setIsAuthenticated(true)} />
            )
          }
        />
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <AuthenticatedApp onLogout={() => setIsAuthenticated(false)} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

function LoginPage({ onLogin }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: 'itadmin', password: 'helpdesk123' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Access denied.')
      }

      localStorage.setItem('helpdesk-auth', JSON.stringify({ username: data.username }))
      onLogin()
      navigate('/tickets', { replace: true })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-header">
          <p className="eyebrow">Helpdesk Portal</p>
          <h1>Monitor and manage IT support tickets</h1>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="itadmin"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="helpdesk123"
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}

function AuthenticatedApp({ onLogout }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('helpdesk-auth')
    onLogout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">IT</div>
          <div>
            <p className="eyebrow">Helpdesk</p>
            <h2>Ticket Center</h2>
          </div>
        </div>

        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/tickets" end>
            Dashboard
          </NavLink>
          <NavLink to="/tickets/new">Create Ticket</NavLink>
        </nav>

        <button type="button" className="logout-button" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <main className="page-content">
        <Routes>
          <Route path="/" element={<Navigate to="/tickets" replace />} />
          <Route path="/tickets" element={<TicketListPage />} />
          <Route path="/tickets/new" element={<TicketFormPage />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          <Route path="/tickets/:id/edit" element={<TicketFormPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  )
}

function TicketListPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadTickets = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/tickets`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load tickets.')
      }

      setTickets(data)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [])

  const handleDelete = async (ticketId) => {
    if (!window.confirm('Do you want to delete this ticket?')) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/tickets/${ticketId}`, { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Ticket could not be deleted.')
      }

      setTickets((current) => current.filter((ticket) => ticket.id !== ticketId))
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <section className="page-block">
      <div className="page-header row-between">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Open support tickets</h1>
        </div>
        <Link to="/tickets/new" className="primary-button">
          + New ticket
        </Link>
      </div>

      {error ? <div className="message error">{error}</div> : null}

      {loading ? (
        <div className="message neutral">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="message neutral">No tickets found. Create the first request.</div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Requester</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <Link to={`/tickets/${ticket.id}`}>{ticket.ticket_number}</Link>
                  </td>
                  <td>{ticket.requester_name}</td>
                  <td>{ticket.subject}</td>
                  <td>{ticket.issue_category}</td>
                  <td>
                    <span className={`badge priority ${ticket.priority.toLowerCase()}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td>
                    <span className="badge status">{ticket.status}</span>
                  </td>
                  <td>{formatDate(ticket.created_at)}</td>
                  <td className="actions-cell">
                    <Link to={`/tickets/${ticket.id}`} className="mini-link">
                      View
                    </Link>
                    <Link to={`/tickets/${ticket.id}/edit`} className="mini-link">
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="mini-delete"
                      onClick={() => handleDelete(ticket.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Link to="/tickets/new" className="floating-action-button" aria-label="Create new ticket">
        +
      </Link>
    </section>
  )
}

function TicketFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const isEdit = location.pathname.endsWith('/edit')

  const [form, setForm] = useState(getDefaultForm())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isEdit || !id) {
      return
    }

    const loadTicket = async () => {
      try {
        const response = await fetch(`${API_URL}/tickets/${id}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load ticket for editing.')
        }

        setForm({
          requesterName: data.requester_name,
          category: data.issue_category,
          priority: data.priority,
          status: data.status,
          subject: data.subject,
          description: data.description,
        })
      } catch (loadError) {
        setError(loadError.message)
      }
    }

    loadTicket()
  }, [id, isEdit])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        isEdit ? `${API_URL}/tickets/${id}` : `${API_URL}/tickets`,
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requesterName: form.requesterName,
            category: form.category,
            priority: form.priority,
            status: form.status,
            subject: form.subject,
            description: form.description,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Ticket could not be saved.')
      }

      const savedTicketId = isEdit ? id : data.ticket.id
      navigate(`/tickets/${savedTicketId}`)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-block">
      <div className="page-header">
        <p className="eyebrow">{isEdit ? 'Update request' : 'New request'}</p>
        <h1>{isEdit ? 'Edit support ticket' : 'Raise a support ticket'}</h1>
      </div>

      <form className="ticket-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Requester Name
            <input
              type="text"
              name="requesterName"
              value={form.requesterName}
              onChange={handleChange}
              placeholder="Jane Smith"
            />
          </label>

          <label>
            Issue Category
            <select name="category" value={form.category} onChange={handleChange}>
              <option value="Hardware">Hardware</option>
              <option value="Software">Software</option>
              <option value="Network">Network</option>
              <option value="Access">Access</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label>
            Priority
            <select name="priority" value={form.priority} onChange={handleChange}>
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select name="status" value={form.status} onChange={handleChange}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="full-width">
            Subject
            <input
              type="text"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="Printer not responding"
            />
          </label>

          <label className="full-width">
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="5"
              placeholder="Describe the incident and how it affects business operations."
            />
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="form-actions">
          <Link to={isEdit ? `/tickets/${id}` : '/tickets'} className="secondary-button">
            Cancel
          </Link>
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Update ticket' : 'Submit ticket'}
          </button>
        </div>
      </form>
    </section>
  )
}

function TicketDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [status, setStatus] = useState('Open')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadTicket = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/tickets/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Ticket details could not be loaded.')
      }

      setTicket(data)
      setStatus(data.status)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTicket()
  }, [id])

  const handleStatusUpdate = async () => {
    if (!ticket) {
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterName: ticket.requester_name,
          category: ticket.issue_category,
          priority: ticket.priority,
          status,
          subject: ticket.subject,
          description: ticket.description,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Status could not be updated.')
      }

      setTicket(data.ticket)
      setStatus(data.ticket.status)
    } catch (updateError) {
      setError(updateError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this ticket permanently?')) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/tickets/${id}`, { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Ticket could not be deleted.')
      }

      navigate('/tickets', { replace: true })
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  if (loading) {
    return <div className="message neutral">Loading ticket details...</div>
  }

  if (error) {
    return <div className="message error">{error}</div>
  }

  if (!ticket) {
    return null
  }

  return (
    <section className="page-block">
      <div className="page-header row-between">
        <div>
          <p className="eyebrow">Ticket details</p>
          <h1>{ticket.ticket_number}</h1>
        </div>
        <button type="button" className="secondary-button" onClick={() => navigate('/tickets')}>
          Back to list
        </button>
      </div>

      <article className="ticket-detail-card">
        <div className="detail-summary">
          <div>
            <p className="eyebrow">Subject</p>
            <h2>{ticket.subject}</h2>
          </div>
          <span className={`badge priority ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span>
        </div>

        <div className="detail-grid">
          <div>
            <p className="label">Requester</p>
            <p>{ticket.requester_name}</p>
          </div>
          <div>
            <p className="label">Category</p>
            <p>{ticket.issue_category}</p>
          </div>
          <div>
            <p className="label">Status</p>
            <p>
              <span className="badge status">{ticket.status}</span>
            </p>
          </div>
          <div>
            <p className="label">Created</p>
            <p>{formatDate(ticket.created_at)}</p>
          </div>
        </div>

        <div className="description-block">
          <p className="label">Description</p>
          <p>{ticket.description}</p>
        </div>
      </article>

      <div className="detail-toolbar">
        <div className="update-status-wrap">
          <label>
            Update status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="action-row">
          <button type="button" className="primary-button" onClick={handleStatusUpdate} disabled={saving}>
            {saving ? 'Updating...' : 'Save status'}
          </button>
          <button type="button" className="secondary-button" onClick={() => navigate(`/tickets/${id}/edit`)}>
            Edit ticket
          </button>
          <button type="button" className="danger-button" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
    </section>
  )
}

function NotFoundPage() {
  return (
    <section className="page-block">
      <div className="message neutral">Page not found.</div>
    </section>
  )
}

export default App
