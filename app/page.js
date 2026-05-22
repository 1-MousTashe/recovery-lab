'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const SECTIONS = [
  { id: 'rehabilitation', label: 'Rehabilitation' },
  { id: 'strength', label: 'Strength' },
  { id: 'lymph-flow', label: 'Lymph Flow' },
]

const SAGE = '#5b7a5e'
const SAGE_LIGHT = '#e8ede9'
const CREAM = '#f8f6f1'
const CHARCOAL = '#1a1a1a'
const GRAY = '#8a8a8a'
const WHITE = '#ffffff'

export default function Home() {
  const [section, setSection] = useState('rehabilitation')
  const [videos, setVideos] = useState([])
  const [admin, setAdmin] = useState(false)
  const [player, setPlayer] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [toast, setToast] = useState('')
  const [delTarget, setDelTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const fileRef = useRef()

  useEffect(() => {
    fetchVideos()
  }, [section])

  async function fetchVideos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('section', section)
      .order('created_at', { ascending: false })

    if (error) {
      flash('Failed to load videos')
      setVideos([])
    } else {
      setVideos(data || [])
    }
    setLoading(false)
  }

  function toggleAdmin() {
    if (admin) {
      setAdmin(false)
      return
    }
    const pin = prompt('Enter admin PIN:')
    if (pin === process.env.NEXT_PUBLIC_ADMIN_PIN) {
      setAdmin(true)
      flash('Admin mode enabled')
    } else if (pin !== null) {
      flash('Incorrect PIN')
    }
  }

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      flash('Select a video file')
      return
    }

    setUploading(true)
    setProgress('Uploading...')

    const ext = file.name.split('.').pop()
    const safeName = Date.now() + '-' + Math.random().toString(36).slice(2)
    const path = `${section}/${safeName}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('videos')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (uploadErr) {
      flash('Upload failed -- ' + uploadErr.message)
      setUploading(false)
      setProgress('')
      return
    }

    setProgress('Saving...')

    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(path)

    const displayName = file.name.replace(/\.[^.]+$/, '')

    const { error: dbErr } = await supabase
      .from('videos')
      .insert({
        name: displayName,
        section: section,
        file_path: path,
        url: urlData.publicUrl,
      })

    if (dbErr) {
      flash('Failed to save video record')
    } else {
      flash(displayName + ' uploaded')
      fetchVideos()
    }

    setUploading(false)
    setProgress('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function deleteVideo(v) {
    await supabase.storage.from('videos').remove([v.file_path])
    await supabase.from('videos').delete().eq('id', v.id)
    setDelTarget(null)
    if (player?.id === v.id) setPlayer(null)
    fetchVideos()
    flash('Video removed')
  }

  return (
    <div style={{ minHeight: '100vh', background: CREAM }}>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: CHARCOAL, color: WHITE, padding: '10px 22px', borderRadius: 8,
          fontSize: 13, fontWeight: 500, zIndex: 999, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          animation: 'toastIn 0.2s ease',
        }}>
          {toast}
        </div>
      )}

      {/* Delete confirmation */}
      {delTarget && (
        <Overlay onClose={() => setDelTarget(null)}>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 20, lineHeight: 1.5 }}>
            Delete <strong>{delTarget.name}</strong>? This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setDelTarget(null)} style={btnStyle('transparent', CHARCOAL)}>
              Cancel
            </button>
            <button onClick={() => deleteVideo(delTarget)} style={btnStyle('#c0392b', WHITE)}>
              Delete
            </button>
          </div>
        </Overlay>
      )}

      {/* Video player modal */}
      {player && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 800,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 20, animation: 'fadeIn 0.15s ease',
          }}
          onClick={() => setPlayer(null)}
        >
          <div
            style={{ maxWidth: 840, width: '100%' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
            }}>
              <p style={{ color: WHITE, fontSize: 15, fontWeight: 600, margin: 0 }}>
                {player.name}
              </p>
              <button
                onClick={() => setPlayer(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', color: WHITE,
                  width: 32, height: 32, borderRadius: 8, fontSize: 16,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <video
              key={player.id}
              controls
              autoPlay
              playsInline
              style={{ width: '100%', borderRadius: 10, background: '#000', maxHeight: '75vh' }}
              src={player.url}
            />
            {/* Quick nav for other videos in this section */}
            {videos.length > 1 && (
              <div style={{
                display: 'flex', gap: 6, marginTop: 14, overflowX: 'auto',
                paddingBottom: 4,
              }}>
                {videos.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setPlayer(v)}
                    style={{
                      flexShrink: 0, padding: '7px 14px', borderRadius: 6,
                      border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      background: v.id === player.id ? SAGE : 'rgba(255,255,255,0.1)',
                      color: WHITE, fontFamily: 'inherit',
                      transition: 'background 0.15s',
                    }}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${SAGE_LIGHT}`,
        background: WHITE, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
          Recovery Lab
        </h1>
        <button onClick={toggleAdmin} style={{
          background: admin ? SAGE : SAGE_LIGHT,
          color: admin ? WHITE : GRAY,
          border: 'none', borderRadius: 20, padding: '6px 14px',
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          transition: 'all 0.2s', fontFamily: 'inherit',
        }}>
          {admin ? 'Admin' : 'Manage'}
        </button>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '20px 16px 80px' }}>

        {/* Section toggle tabs */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 28,
          background: WHITE, borderRadius: 10, padding: 4,
          border: `1px solid ${SAGE_LIGHT}`,
        }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                flex: 1, padding: '11px 8px', borderRadius: 8, border: 'none',
                background: section === s.id ? SAGE : 'transparent',
                color: section === s.id ? WHITE : GRAY,
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Upload button (admin only) */}
        {admin && (
          <div style={{ marginBottom: 24 }}>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                ...btnStyle(SAGE, WHITE),
                width: '100%', padding: '14px 20px', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: uploading ? 0.6 : 1, fontFamily: 'inherit',
              }}
            >
              {uploading ? progress : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                  Upload Video
                </>
              )}
            </button>
          </div>
        )}

        {/* Video grid */}
        {loading ? (
          <p style={{ textAlign: 'center', color: GRAY, fontSize: 14, padding: 48 }}>
            Loading...
          </p>
        ) : videos.length === 0 ? (
          <EmptyState admin={admin} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {videos.map(v => (
              <VideoCard
                key={v.id}
                video={v}
                admin={admin}
                onPlay={() => setPlayer(v)}
                onDelete={() => setDelTarget(v)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}


function VideoCard({ video, admin, onPlay, onDelete }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onClick={onPlay}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: WHITE, borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${SAGE_LIGHT}`,
        boxShadow: hover ? '0 4px 16px rgba(0,0,0,0.06)' : 'none',
        transform: hover ? 'translateY(-1px)' : 'none',
        transition: 'box-shadow 0.2s, transform 0.15s',
      }}
    >
      <div style={{
        height: 120,
        background: `linear-gradient(135deg, ${SAGE_LIGHT}, #d4ddd5)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(255,255,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transform: hover ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform 0.2s',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={SAGE} stroke="none">
            <polygon points="6 3 20 12 6 21" />
          </svg>
        </div>
      </div>
      <div style={{
        padding: '10px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <p style={{
          fontSize: 13, fontWeight: 500, margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: admin ? '75%' : '100%',
        }}>
          {video.name}
        </p>
        {admin && (
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 2, color: GRAY,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H7a1 1 0 01-1-1V6h14" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}


function EmptyState({ admin }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 20px' }}>
      <svg
        width="40" height="40" viewBox="0 0 24 24" fill="none"
        stroke={GRAY} strokeWidth="1.5"
        style={{ opacity: 0.3, marginBottom: 12 }}
      >
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" />
      </svg>
      <p style={{ color: GRAY, fontSize: 14 }}>
        {admin ? 'No videos yet -- upload one above' : 'No videos in this section'}
      </p>
    </div>
  )
}


function Overlay({ onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: WHITE, borderRadius: 12, padding: 28,
          maxWidth: 360, width: '90%',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}


function btnStyle(bg, color) {
  return {
    background: bg,
    color: color,
    border: bg === 'transparent' ? '1px solid #ddd' : 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    fontFamily: "'Outfit', sans-serif",
  }
}
