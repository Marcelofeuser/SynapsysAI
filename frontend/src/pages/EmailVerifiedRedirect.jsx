import { useEffect } from 'react'

export default function EmailVerifiedRedirect() {
  useEffect(() => {
    window.location.replace('/synapsys_v5.html')
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: '#030a12',
      color: '#c8eeff',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      Validando acesso...
    </div>
  )
}
