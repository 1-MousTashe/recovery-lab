'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const SECTIONS = [
  { id: 'rehabilitation', label: 'Rehabilitation' },
  { id: 'strength', label: 'Strength' },
  { id: 'lymph-flow', label: 'Lymph Flow' },
]

const C = {
  bg1: '#0f0a2e',
  bg2: '#1a1145',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.1)',
  accent: '#ff4d6d',
  accentSoft: 'rgba(255,77,109,0.15)',
  purple: '#7c3aed',
  purpleSoft: 'rgba(124,58,237,0.2)',
  text: '#ffffff',
  textDim: 'rgba(255,255,255,0.5)',
  textMid: 'rgba(255,255,255,0.7)',
}

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
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, ${C.bg1} 0%, ${C.bg2} 50%, ${C.bg1} 100%)`,
      color: C.text,
    }}>

      {/* Background orbs */}
      <div style={{
        position: 'fixed', top: '-20%', right: '-10%', width: 400, height: 400,
        borderRadius: '50%', background: 'rgba(124,58,237,0.08)', filter: 'blur(80px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-15%', left: '-10%', width: 350, height: 350,
        borderRadius: '50%', background: 'rgba(255,77,109,0.06)', filter: 'blur(80px)',
        pointerEvents: 'none',
      }} />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: C.accent, color: C.text, padding: '10px 22px', borderRadius: 10,
          fontSize: 13, fontWeight: 500, zIndex: 999,
          boxShadow: '0 4px 24px rgba(255,77,109,0.3)',
          animation: 'toastIn 0.2s ease',
        }}>
          {toast}
        </div>
      )}

      {/* Delete confirmation */}
      {delTarget && (
        <Overlay onClose={() => setDelTarget(null)}>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 20, lineHeight: 1.5, color: C.text }}>
            Delete <strong>{delTarget.name}</strong>? This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setDelTarget(null)} style={btnStyle('rgba(255,255,255,0.08)', C.textMid)}>
              Cancel
            </button>
            <button onClick={() => deleteVideo(delTarget)} style={btnStyle(C.accent, C.text)}>
              Delete
            </button>
          </div>
        </Overlay>
      )}

      {/* Video player modal */}
      {player && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 800,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 20, animation: 'fadeIn 0.15s ease',
          }}
          onClick={() => setPlayer(null)}
        >
          <div style={{ maxWidth: 840, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
            }}>
              <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: 0 }}>
                {player.name}
              </p>
              <button onClick={() => setPlayer(null)} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', color: C.text,
                width: 32, height: 32, borderRadius: 8, fontSize: 16,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
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
              style={{ width: '100%', borderRadius: 12, background: '#000', maxHeight: '75vh' }}
              src={player.url}
            />
            {videos.length > 1 && (
              <div style={{
                display: 'flex', gap: 6, marginTop: 14, overflowX: 'auto', paddingBottom: 4,
              }}>
                {videos.map(v => (
                  <button key={v.id} onClick={() => setPlayer(v)} style={{
                    flexShrink: 0, padding: '7px 14px', borderRadius: 8,
                    border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    background: v.id === player.id ? C.accent : 'rgba(255,255,255,0.08)',
                    color: C.text, fontFamily: 'inherit', transition: 'background 0.15s',
                  }}>
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
        borderBottom: `1px solid ${C.cardBorder}`,
        background: 'rgba(15,10,46,0.8)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
          Recovery Lab
        </h1>
        <button onClick={toggleAdmin} style={{
          background: admin ? C.accent : 'rgba(255,255,255,0.08)',
          color: admin ? C.text : C.textMid,
          border: `1px solid ${admin ? 'transparent' : C.cardBorder}`,
          borderRadius: 20, padding: '6px 14px',
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          transition: 'all 0.2s', fontFamily: 'inherit',
          boxShadow: admin ? '0 2px 12px rgba(255,77,109,0.3)' : 'none',
        }}>
          {admin ? 'Admin' : 'Manage'}
        </button>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '20px 16px 80px', position: 'relative' }}>

        {/* Section toggle */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 28,
          background: C.card, borderRadius: 12, padding: 4,
          border: `1px solid ${C.cardBorder}`,
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              flex: 1, padding: '11px 8px', borderRadius: 10, border: 'none',
              background: section === s.id
                ? 'linear-gradient(135deg, ' + C.accent + ', ' + C.purple + ')'
                : 'transparent',
              color: section === s.id ? C.text : C.textDim,
              fontSize: 13, fontWeight: section === s.id ? 600 : 500,
              cursor: 'pointer', transition: 'all 0.25s', fontFamily: 'inherit',
              boxShadow: section === s.id ? '0 2px 12px rgba(255,77,109,0.25)' : 'none',
            }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Upload (admin) */}
        {admin && (
          <div style={{ marginBottom: 24 }}>
            <input ref={fileRef} type="file" accept="video/*" onChange={handleUpload} style={{ display: 'none' }} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                width: '100%', padding: '14px 20px', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: uploading ? 0.6 : 1, fontFamily: 'inherit',
                background: 'linear-gradient(135deg, ' + C.accent + ', ' + C.purple + ')',
                color: C.text, border: 'none', borderRadius: 12,
                fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s',
                boxShadow: '0 4px 20px rgba(255,77,109,0.25)',
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
          <p style={{ textAlign: 'center', color: C.textDim, fontSize: 14, padding: 48 }}>
            Loading...
          </p>
        ) : videos.length === 0 ? (
          <EmptyState admin={admin} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: 14,
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
  const vidRef = useRef(null)

  useEffect(() => {
    const vid = vidRef.current
    if (!vid) return
    const handleLoaded = () => { vid.currentTime = 0.5 }
    vid.addEventListener('loadeddata', handleLoaded)
    return () => vid.removeEventListener('loadeddata', handleLoaded)
  }, [video.url])

  return (
    <div
      onClick={onPlay}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: C.card,
        borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${hover ? 'rgba(255,77,109,0.3)' : C.cardBorder}`,
        boxShadow: hover ? '0 8px 32px rgba(255,77,109,0.12)' : 'none',
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'all 0.25s ease',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Thumbnail area */}
      <div style={{
        height: 160, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${C.purpleSoft}, ${C.accentSoft})`,
      }}>
        <video
          ref={vidRef}
          src={video.url}
          muted
          playsInline
          preload="metadata"
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            display: 'block',
          }}
        />
        {/* Play button overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: hover ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)',
          transition: 'background 0.25s',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: hover ? C.accent : 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            transform: hover ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.25s',
            boxShadow: hover ? '0 4px 16px rgba(255,77,109,0.4)' : 'none',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={C.text} stroke="none">
              <polygon points="7 3 21 12 7 21" />
            </svg>
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <p style={{
          fontSize: 13, fontWeight: 500, margin: 0, color: C.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: admin ? '75%' : '100%',
        }}>
          {video.name}
        </p>
        {admin && (
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6, cursor: 'pointer', padding: '4px 6px',
              color: C.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: C.card, border: `1px solid ${C.cardBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="1.5">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
      </div>
      <p style={{ color: C.textDim, fontSize: 14, lineHeight: 1.6 }}>
        {admin ? 'No videos yet -- upload one above' : 'No videos in this section'}
      </p>
    </div>
  )
}


function Overlay({ onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.bg2,
          border: `1px solid ${C.cardBorder}`,
          borderRadius: 16, padding: 28,
          maxWidth: 360, width: '90%',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
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
    background: bg, color: color,
    border: bg.includes('rgba') ? `1px solid ${C.cardBorder}` : 'none',
    borderRadius: 10, padding: '8px 16px',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
    transition: 'opacity 0.15s', fontFamily: "'Outfit', sans-serif",
  }
}
