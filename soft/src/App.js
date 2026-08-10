import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import './styles/App.css';
import './styles/Applications-style.css'

const API_URL = 'http://localhost:5000';

// ========================================
// === ХУК ПРОВЕРКИ СЕССИИ ================
// ========================================
function useSessionGuard(allowedStatus) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false); // true = проверка завершена

  useEffect(() => {
    fetch(`${API_URL}/api/session`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        // 1) Пользователь удалён или cookie недействительна → на регистрацию
        if (!data.authenticated) {
          navigate('/', { replace: true });
          return;
        }

        // 2) Статус изменился → редирект на правильный маршрут
        if (data.status !== allowedStatus) {
          navigate(data.redirect || '/', { replace: true });
          return;
        }

        // 3) Всё в порядке — разрешаем рендер
        setChecked(true);
      })
      .catch(() => {
        // Сервер недоступен — разлогиниваем на главную
        navigate('/', { replace: true });
      });
  }, [navigate, allowedStatus]);

  return checked; // false = показываем заглушку / ничего не рендерим
}

// ========================================
// === ГЛАВНАЯ СТРАНИЦА (без изменений) ====
// ========================================
function HomePage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [regData, setRegData] = useState({ name: '', surname: '', email: '', password: '' });
  const [logData, setLogData] = useState({ email: '', password: '' });

  const toggleForm = () => { setIsLogin(!isLogin); setError(''); };

  // Повторный заход на сайт: проверяем cookie → уходим по статусу или остаёмся
  useEffect(() => {
    fetch(`${API_URL}/api/session`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) navigate(data.redirect || '/dashboard');
      })
      .catch(() => { /* сервер недоступен — остаёмся на регистрации */ });
  }, [navigate]);

  const handleRegChange = (e) =>
    setRegData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleLogChange = (e) =>
    setLogData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // ===== РЕГИСТРАЦИЯ =====
  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(regData),
      });
      const data = await res.json();
      if (res.ok && data.success) navigate(data.redirect || '/dashboard');
      else setError(data.message || 'Ошибка регистрации');
    } catch {
      setError('Сервер недоступен, попробуйте позже');
    } finally { setLoading(false); }
  };

  // ===== ВХОД =====
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(logData),
      });
      const data = await res.json();
      if (res.ok && data.success) navigate(data.redirect || '/dashboard');
      else setError(data.message || 'Неверная почта или пароль');
    } catch {
      setError('Сервер недоступен, попробуйте позже');
    } finally { setLoading(false); }
  };

  return (
    <div className="App">
      <div className="TopContainer">
        <div className="Autintefication">
          <div className="Logo">
            <i className="bx bx-cube-alt"></i>
            <h1>Cube</h1>
          </div>
          <div className="Autintefication-Login_Container">
            {!isLogin ? (
              <form className="Autintefication-Login_Container-REG" onSubmit={handleRegister}>
                <h1>Регистрация</h1>
                <input name="name" placeholder="Имя" type="text"
                       value={regData.name} onChange={handleRegChange} required />
                <input name="surname" placeholder="Фамилия" type="text"
                       value={regData.surname} onChange={handleRegChange} required />
                <input name="email" placeholder="Почта" type="email"
                       value={regData.email} onChange={handleRegChange} required />
                <input name="password" placeholder="Пароль" type="password"
                       value={regData.password} onChange={handleRegChange} required />
                <button type="submit" disabled={loading}>
                  {loading ? 'Обработка...' : 'Зарегистрироваться'}
                </button>
                {error && <h3 className="auth-error">{error}</h3>}
                <h3 onClick={toggleForm} className="dashboard-link">Есть аккаунт. Войти!</h3>
              </form>
            ) : (
              <form className="Autintefication-Login_Container-LOG" onSubmit={handleLogin}>
                <h1>Вход</h1>
                <input name="email" placeholder="Почта" type="email"
                       value={logData.email} onChange={handleLogChange} required />
                <input name="password" placeholder="Пароль" type="password"
                       value={logData.password} onChange={handleLogChange} required />
                <button type="submit" disabled={loading}>
                  {loading ? 'Проверка...' : 'Войти'}
                </button>
                {error && <h3 className="auth-error">{error}</h3>}
                <h3 onClick={toggleForm} className="dashboard-link">Нет аккаунта. Зарегистрироваться!</h3>
              </form>
            )}
          </div>
        </div>
        <div className="video-bg">
          <video autoPlay loop muted playsInline>
            <source src={require('./RightPanel.mp4')} type="video/mp4" />
          </video>
        </div>
      </div>
    </div>
  );
}

// ========================================
// === МОДАЛЬНОЕ ОКНО «ОФОРМИТЬ ЗАЯВКУ» ===
// ========================================
function RequestModal({ onClose }) {
  const [formData, setFormData] = useState({
    entrance: '1', // По умолчанию 1
    floor: '1',    // По умолчанию 1
    category: 'Уборка', // По умолчанию Уборка
    description: '',
  });
  const [mediaFiles, setMediaFiles] = useState([]); // { file, preview, type }
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState(null); // ID заявки от сервера
  
  const fileInputRef = useRef(null);
  const MAX_MEDIA = 5;

  // Закрытие по Esc + блокировка скролла фона
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      mediaFiles.forEach((m) => URL.revokeObjectURL(m.preview));
    };
  }, [onClose, mediaFiles]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remainingSlots = MAX_MEDIA - mediaFiles.length;
    if (remainingSlots <= 0) return;
    const filesToAdd = files.slice(0, remainingSlots);
    const newMedia = filesToAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'video' : 'image',
    }));
    setMediaFiles((prev) => [...prev, ...newMedia]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMedia = (index) => {
    setMediaFiles((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].preview);
      copy.splice(index, 1);
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      
      // Добавляем поля формы
      formDataToSend.append('entrance', formData.entrance);
      formDataToSend.append('floor', formData.floor);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('description', formData.description);

      // Добавляем файлы
      mediaFiles.forEach((mediaItem) => {
        formDataToSend.append('media', mediaItem.file);
      });

      const res = await fetch(`${API_URL}/api/requests`, {
        method: 'POST',
        credentials: 'include', // Передаем cookie для авторизации
        body: formDataToSend,
        // Headers не указываем Content-Type, браузер сам добавит boundary
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRequestId(data.requestId);
        setSubmitted(true);
      } else {
        setError(data.message || 'Ошибка при отправке заявки');
      }
    } catch (err) {
      console.error(err);
      setError('Сервер недоступен, попробуйте позже');
    } finally {
      setLoading(false);
    }
  };

  const isLimitReached = mediaFiles.length >= MAX_MEDIA;

  return (
    <div className="Modal-Overlay" onClick={onClose}>
      <div className="Modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="Modal-Close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <i className="bx bx-x"></i>
        </button>

        {submitted ? (
          <div className="Modal-Success">
            <i className="bx bx-check-circle"></i>
            <h2>Заявка успешно оформлена!</h2>
            <p>
              Мы получили ваше обращение и отреагируем в кратчайший срок.
            </p>
            {requestId && (
              <p style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#4CAF50', marginTop: '10px' }}>
                Номер вашей заявки: #{requestId}
              </p>
            )}
            <button type="button" onClick={onClose} style={{ marginTop: '20px' }}>
              Отлично
            </button>
          </div>
        ) : (
          <>
            <div className="Modal-Header">
              <i className="bx bx-edit-alt"></i>
              <h1>Оформить заявку</h1>
              <p>Заполните форму и прикрепите фото/видео проблемы</p>
            </div>
            <form className="Modal-Form" onSubmit={handleSubmit}>
              
              {/* Подъезд */}
              <div className="Modal-Field">
                <label htmlFor="req-entrance">Подъезд</label>
                <div className="Modal-InputWrap">
                  <i className="bx bx-category"></i>
                  <select
                    id="req-entrance"
                    name="entrance" // ИСПРАВЛЕНО
                    value={formData.entrance}
                    onChange={handleChange}
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="Улица">Улица</option>
                  </select>
                  <i className="bx bx-chevron-down Modal-SelectArrow"></i>
                </div>
              </div>

              {/* Этаж */}
              <div className="Modal-Field">
                <label htmlFor="req-floor">Этаж</label>
                <div className="Modal-InputWrap">
                  <i className="bx bx-category"></i>
                  <select
                    id="req-floor"
                    name="floor" // ИСПРАВЛЕНО
                    value={formData.floor}
                    onChange={handleChange}
                  >
                    {[...Array(17)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                    <option value="Другой">Другой</option>
                  </select>
                  <i className="bx bx-chevron-down Modal-SelectArrow"></i>
                </div>
              </div>

              {/* Категория */}
              <div className="Modal-Field">
                <label htmlFor="req-category">Категория</label>
                <div className="Modal-InputWrap">
                  <i className="bx bx-category"></i>
                  <select
                    id="req-category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    <option value="Уборка">Уборка</option>
                  </select>
                  <i className="bx bx-chevron-down Modal-SelectArrow"></i>
                </div>
              </div>

              {/* ===== ЗАГРУЗКА ФОТО / ВИДЕО ===== */}
              <div className="Modal-MediaUpload">
                <label>Фото / Видео проблемы</label>
                <div className="Media-PreviewGrid">
                  {mediaFiles.map((item, idx) => (
                    <div className="Media-Item" key={idx}>
                      {item.type === 'video' ? (
                        <video src={item.preview} muted playsInline />
                      ) : (
                        <img src={item.preview} alt="upload" />
                      )}
                      <button
                        type="button"
                        className="Media-Remove"
                        onClick={() => removeMedia(idx)}
                      >
                        <i className="bx bx-x"></i>
                      </button>
                    </div>
                  ))}
                  {!isLimitReached && (
                    <div
                      className="Media-AddBtn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <i className="bx bx-plus"></i>
                      <span>Добавить</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <div className="Media-Hint">
                  {mediaFiles.length} / {MAX_MEDIA} файлов
                </div>
              </div>

              {/* Описание проблемы */}
              <div className="Modal-Field">
                <label htmlFor="req-desc">Описание проблемы</label>
                <div className="Modal-InputWrap Modal-InputWrap_Textarea">
                  <i className="bx bx-message-detail"></i>
                  <textarea
                    id="req-desc"
                    name="description"
                    placeholder="Опишите проблему..."
                    value={formData.description}
                    onChange={handleChange}
                    required
                  ></textarea>
                </div>
              </div>

              {error && <div style={{ color: 'red', marginBottom: '10px', textAlign: 'center' }}>{error}</div>}

              <button type="submit" className="Modal-Submit" disabled={loading}>
                {loading ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin"></i> Отправка...
                  </>
                ) : (
                  <>
                    <i className="bx bx-send"></i> Отправить заявку
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
// ========================================
// === Заявки пользователя ===============
// ========================================
function User_Applications({ onClose }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // ===== ЛАЙТБОКС =====
  // { images: [url, ...], index: 0 } или null
  const [lightbox, setLightbox] = useState(null);

  // Загрузка заявок
  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`${API_URL}/api/requests/my`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setRequests(data.requests || []);
        else setError(data.message || 'Ошибка загрузки');
      })
      .catch(() => setError('Сервер недоступен'))
      .finally(() => setLoading(false));
  }, []);

  // Блокировка скролла фона
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  // ===== Закрытие по Esc + стрелки в лайтбоксе =====
  useEffect(() => {
    const onKey = (e) => {
      if (lightbox) {
        // Лайтбокс открыт: Esc закрывает фото, стрелки листают
        if (e.key === 'Escape') {
          e.stopPropagation();
          setLightbox(null);
        }
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
      } else if (e.key === 'Escape') {
        onClose(); // Esc без лайтбокса закрывает модалку
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, onClose]);

  const toggleExpand = (id) => setExpandedId((p) => (p === id ? null : id));

  // ===== Открыть лайтбокс =====
  // images — массив URL картинок заявки, index — по какой кликнули
  const openLightbox = (images, index) => setLightbox({ images, index });

  const nextImage = () =>
    setLightbox((lb) =>
      lb ? { ...lb, index: (lb.index + 1) % lb.images.length } : lb
    );

  const prevImage = () =>
    setLightbox((lb) =>
      lb ? { ...lb, index: (lb.index - 1 + lb.images.length) % lb.images.length } : lb
    );

  const statusMap = {
    'Оформлено': { color: '#6ab7ff', bg: 'rgba(106,183,255,0.12)', border: 'rgba(106,183,255,0.35)' },
    'В работе': { color: '#ffb84d', bg: 'rgba(255,184,77,0.12)', border: 'rgba(255,184,77,0.35)' },
    'Исполнение утверждено': { color: '#5ee08a', bg: 'rgba(94,224,138,0.12)', border: 'rgba(94,224,138,0.35)' },
  };

  return (
    <div className="Modal-Overlay" onClick={onClose}>
      <div className="Modal Modal-Wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="Modal-Close" onClick={onClose} aria-label="Закрыть">
          <i className="bx bx-x"></i>
        </button>

        <div className="Modal-Header">
          <i className="bx bx-file"></i>
          <h1>Мои заявки</h1>
          <p>Список ваших обращений и их статусы</p>
        </div>

        {loading && (
          <div className="UserApps-State">
            <i className="bx bx-loader-alt bx-spin"></i>
            <span>Загрузка заявок...</span>
          </div>
        )}

        {error && (
          <div className="UserApps-State UserApps-Error">
            <i className="bx bx-error-circle"></i>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && requests.length === 0 && (
          <div className="UserApps-State">
            <i className="bx bx-inbox"></i>
            <span>У вас пока нет заявок</span>
          </div>
        )}

        {!loading && !error && requests.length > 0 && (
          <div className="UserApps-List">
            {requests.map((req) => {
              const st = statusMap[req.status] || statusMap['Оформлено'];
              const isExpanded = expandedId === req.id;

              // Только картинки (для лайтбокса), в порядке отображения
              const imagesOnly = (req.media || [])
                .filter((m) => m.type === 'image')
                .map((m) => `${API_URL}${m.url}`);

              return (
                <div className={`UserApps-Card ${isExpanded ? 'expanded' : ''}`} key={req.id}>
                  {/* Шапка карточки */}
                  <div className="UserApps-CardHead" onClick={() => toggleExpand(req.id)}>
                    <div className="UserApps-CardHead-Left">
                      <span className="UserApps-Id">#{req.id}</span>
                      <span className="UserApps-Category">{req.category}</span>
                    </div>
                    <div className="UserApps-CardHead-Right">
                      <span
                        className="UserApps-Status"
                        style={{ color: st.color, background: st.bg, borderColor: st.border }}
                      >
                        <span className="UserApps-StatusDot" style={{ background: st.color }}></span>
                        {req.status}
                      </span>
                      <i className={`bx ${isExpanded ? 'bx-chevron-up' : 'bx-chevron-down'} UserApps-Arrow`}></i>
                    </div>
                  </div>

                  {/* Краткая информация */}
                  <div className="UserApps-CardBody">
                    <div className="UserApps-InfoRow">
                      <i className="bx bx-door-open"></i>
                      <span>Подъезд: <strong>{req.entrance}</strong></span>
                    </div>
                    <div className="UserApps-InfoRow">
                      <i className="bx bx-layer"></i>
                      <span>Этаж: <strong>{req.floor}</strong></span>
                    </div>
                  </div>

                  {/* Раскрывающаяся часть */}
                  {isExpanded && (
                    <div className="UserApps-Expanded">
                      {req.description && (
                        <div className="UserApps-Desc">
                          <div className="UserApps-DescLabel">
                            <i className="bx bx-message-detail"></i> Описание
                          </div>
                          <p>{req.description}</p>
                        </div>
                      )}

                      {req.media && req.media.length > 0 && (
                        <div className="UserApps-Media">
                          <div className="UserApps-MediaLabel">
                            <i className="bx bx-images"></i> Медиа ({req.media.length})
                          </div>
                          <div className="UserApps-MediaGrid">
                            {req.media.map((m, idx) => {
                              // Позиция картинки среди ТОЛЬКО картинок (для лайтбокса)
                              const imgIdx = m.type === 'image'
                                ? imagesOnly.indexOf(`${API_URL}${m.url}`)
                                : -1;

                              return (
                                <div className="UserApps-MediaItem" key={idx}>
                                  {m.type === 'video' ? (
                                    <video
                                      src={`${API_URL}${m.url}`}
                                      controls
                                      playsInline
                                      preload="metadata"
                                    />
                                  ) : (
                                    <>
                                      <img
                                        src={`${API_URL}${m.url}`}
                                        alt={`Медиа ${idx + 1}`}
                                        loading="lazy"
                                        onClick={() => openLightbox(imagesOnly, imgIdx)}
                                      />
                                      {/* Иконка-подсказка, что фото кликабельно */}
                                      <span className="UserApps-ZoomHint">
                                        <i className="bx bx-zoom-in"></i>
                                      </span>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {(!req.media || req.media.length === 0) && (
                        <div className="UserApps-NoMedia">
                          <i className="bx bx-image"></i>
                          <span>Медиафайлы не прикреплены</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ===== ЛАЙТБОКС (поверх модалки) ===== */}
        {lightbox && (
          <div className="Lightbox-Overlay" onClick={() => setLightbox(null)}>
            {/* Крестик закрытия */}
            <button
              type="button"
              className="Lightbox-Close"
              onClick={() => setLightbox(null)}
              aria-label="Закрыть просмотр"
            >
              <i className="bx bx-x"></i>
            </button>

            {/* Стрелка влево */}
            {lightbox.images.length > 1 && (
              <button
                type="button"
                className="Lightbox-Arrow Lightbox-Arrow_Left"
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                aria-label="Предыдущее фото"
              >
                <i className="bx bx-chevron-left"></i>
              </button>
            )}

            {/* Само фото (клик по нему не закрывает лайтбокс) */}
            <img
              className="Lightbox-Image"
              src={lightbox.images[lightbox.index]}
              alt={`Просмотр фото ${lightbox.index + 1}`}
              onClick={(e) => e.stopPropagation()}
            />

            {/* Стрелка вправо */}
            {lightbox.images.length > 1 && (
              <button
                type="button"
                className="Lightbox-Arrow Lightbox-Arrow_Right"
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                aria-label="Следующее фото"
              >
                <i className="bx bx-chevron-right"></i>
              </button>
            )}

            {/* Счётчик */}
            {lightbox.images.length > 1 && (
              <div className="Lightbox-Counter">
                {lightbox.index + 1} / {lightbox.images.length}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// === Search Application (с результатом) =
// ========================================
function Search_Application({ onClose }) {
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);   // найденная заявка
  const [lightbox, setLightbox] = useState(null); // { images, index }

  // ---- Лайтбокс: навигация ----
  const nextImage = () =>
    setLightbox((lb) => (lb ? { ...lb, index: (lb.index + 1) % lb.images.length } : lb));
  const prevImage = () =>
    setLightbox((lb) =>
      lb ? { ...lb, index: (lb.index - 1 + lb.images.length) % lb.images.length } : lb
    );

  // ---- Esc: закрыть лайтбокс или модалку; стрелки для фото ----
  useEffect(() => {
    const onKey = (e) => {
      if (lightbox) {
        if (e.key === 'Escape') { e.stopPropagation(); setLightbox(null); }
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, onClose]);

  // ---- Поиск ----
  const handleSearch = async () => {
    const num = searchValue.trim();
    if (!num) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/requests/${encodeURIComponent(num)}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data.request);
      } else {
        setError(data.message || 'Заявка не найдена');
      }
    } catch {
      setError('Сервер недоступен, попробуйте позже');
    } finally {
      setLoading(false);
    }
  };

  const openLightbox = (images, index) => setLightbox({ images, index });

  const statusMap = {
    'Оформлено':              { color: '#6ab7ff', bg: 'rgba(106,183,255,0.12)', border: 'rgba(106,183,255,0.35)' },
    'В работе':               { color: '#ffb84d', bg: 'rgba(255,184,77,0.12)',  border: 'rgba(255,184,77,0.35)' },
    'Исполнение утверждено':  { color: '#5ee08a', bg: 'rgba(94,224,138,0.12)',  border: 'rgba(94,224,138,0.35)' },
  };

  // Только картинки (для лайтбокса)
  const imagesOnly = result
    ? (result.media || []).filter((m) => m.type === 'image').map((m) => `${API_URL}${m.url}`)
    : [];

  return (
    <div className="Modal-Overlay" onClick={onClose}>
      <div className="Modal Modal-Wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="Modal-Close" onClick={onClose} aria-label="Закрыть">
          <i className="bx bx-x"></i>
        </button>

        {/* ================= ФОРМА ПОИСКА ================= */}
        {!result && (
          <>
            <div className="Modal-Header">
              <i className="bx bx-search-alt-2"></i>
              <h1>Найти заявку</h1>
              <p>Введите номер заявки для поиска</p>
            </div>

            <div className="Modal-Field">
              <label htmlFor="search-num">Номер заявки</label>
              <div className="Modal-InputWrap">
                <i className="bx bx-hash"></i>
                <input
                  id="search-num"
                  type="text"
                  placeholder="Например: 1"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div style={{ color: '#ff8a8a', marginBottom: 14, textAlign: 'center', fontSize: 14 }}>
                <i className="bx bx-error-circle" style={{ verticalAlign: 'middle', marginRight: 6 }}></i>
                {error}
              </div>
            )}

            <button
              type="button"
              className="Modal-Submit"
              onClick={handleSearch}
              disabled={loading || !searchValue.trim()}
            >
              {loading ? (
                <><i className="bx bx-loader-alt bx-spin"></i> Поиск...</>
              ) : (
                <><i className="bx bx-search"></i> Найти</>
              )}
            </button>
          </>
        )}

        {/* ================= КАРТОЧКА НАЙДЕННОЙ ЗАЯВКИ ================= */}
        {result && (
          <>
            <div className="Modal-Header">
              <i className="bx bx-file"></i>
              <h1>Заявка № {result.id}</h1>
              <p>Результат поиска</p>
            </div>

            {/* Статус */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              {(() => {
                const st = statusMap[result.status] || statusMap['Оформлено'];
                return (
                  <span
                    className="UserApps-Status"
                    style={{ color: st.color, background: st.bg, borderColor: st.border }}
                  >
                    <span className="UserApps-StatusDot" style={{ background: st.color }}></span>
                    {result.status}
                  </span>
                );
              })()}
            </div>

            {/* Основные поля */}
            <div className="UserApps-CardBody" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 16, padding: '0 0 18px' }}>
              <div className="UserApps-InfoRow">
                <i className="bx bx-door-open"></i>
                <span>Подъезд: <strong>{result.entrance}</strong></span>
              </div>
              <div className="UserApps-InfoRow">
                <i className="bx bx-layer"></i>
                <span>Этаж: <strong>{result.floor}</strong></span>
              </div>
              <div className="UserApps-InfoRow">
                <i className="bx bx-category"></i>
                <span>Категория: <strong>{result.category}</strong></span>
              </div>
            </div>

            {/* Описание */}
            {result.description && result.description !== 'Нет описания' && (
              <div className="UserApps-Desc">
                <div className="UserApps-DescLabel">
                  <i className="bx bx-message-detail"></i> Описание
                </div>
                <p>{result.description}</p>
              </div>
            )}

            {/* Медиафайлы */}
            {result.media && result.media.length > 0 && (
              <div className="UserApps-Media">
                <div className="UserApps-MediaLabel">
                  <i className="bx bx-images"></i> Медиа ({result.media.length})
                </div>
                <div className="UserApps-MediaGrid">
                  {result.media.map((m, idx) => {
                    const imgIdx = m.type === 'image'
                      ? imagesOnly.indexOf(`${API_URL}${m.url}`)
                      : -1;
                    return (
                      <div className="UserApps-MediaItem" key={idx}>
                        {m.type === 'video' ? (
                          <video src={`${API_URL}${m.url}`} controls playsInline preload="metadata" />
                        ) : (
                          <>
                            <img
                              src={`${API_URL}${m.url}`}
                              alt={`Медиа ${idx + 1}`}
                              loading="lazy"
                              onClick={() => openLightbox(imagesOnly, imgIdx)}
                            />
                            <span className="UserApps-ZoomHint">
                              <i className="bx bx-zoom-in"></i>
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Нет медиа */}
            {(!result.media || result.media.length === 0) && (
              <div className="UserApps-NoMedia">
                <i className="bx bx-image"></i>
                <span>Медиафайлы не прикреплены</span>
              </div>
            )}

            {/* Кнопка «Новый поиск» */}
            <button
              type="button"
              className="Modal-Submit"
              style={{ marginTop: 22 }}
              onClick={() => { setResult(null); setSearchValue(''); setError(''); }}
            >
              <i className="bx bx-search"></i> Новый поиск
            </button>
          </>
        )}

        {/* ================= ЛАЙТБОКС ================= */}
        {lightbox && (
          <div className="Lightbox-Overlay" onClick={() => setLightbox(null)}>
            <button type="button" className="Lightbox-Close" onClick={() => setLightbox(null)} aria-label="Закрыть просмотр">
              <i className="bx bx-x"></i>
            </button>

            {lightbox.images.length > 1 && (
              <button
                type="button"
                className="Lightbox-Arrow Lightbox-Arrow_Left"
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                aria-label="Предыдущее фото"
              >
                <i className="bx bx-chevron-left"></i>
              </button>
            )}

            <img
              className="Lightbox-Image"
              src={lightbox.images[lightbox.index]}
              alt={`Просмотр фото ${lightbox.index + 1}`}
              onClick={(e) => e.stopPropagation()}
            />

            {lightbox.images.length > 1 && (
              <button
                type="button"
                className="Lightbox-Arrow Lightbox-Arrow_Right"
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                aria-label="Следующее фото"
              >
                <i className="bx bx-chevron-right"></i>
              </button>
            )}

            {lightbox.images.length > 1 && (
              <div className="Lightbox-Counter">
                {lightbox.index + 1} / {lightbox.images.length}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// ========================================
// === DASHBOARD ===========================
// ========================================
// ========================================
// === DASHBOARD ===========================
// ========================================
function Dashboard() {
  const isAllowed = useSessionGuard('user'); // доступен только для status === 'user'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserApplications, setUserApplications] = useState(false);
  const [isSearchApplication, setSearchApplication] = useState(false);
  const infoRef = useRef(null);

  // Пока проверка не завершена — не рендерим страницу
  if (!isAllowed) return null;

  const scrollToInfo = () => {
    if (infoRef.current) {
      infoRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="Dashboard">
      {/* Видео: закреплённый фон, всегда позади */}
      <div className="Dashboard-Video">
        <video autoPlay loop muted playsInline>
          <source src={require('./RightPanel.mp4')} type="video/mp4" />
        </video>
        <div className="Dashboard-Dim"></div>
      </div>

      {/* Первый экран поверх видео */}
      <div className="Dashboard-Hero">
        <h1>Создавайте заявки</h1>
        <h2>А мы исправим в кратчайший срок!</h2>
        <button onClick={scrollToInfo}>Начать</button>
        <div className="Dashboard-Scroll">
          <i className="bx bx-chevron-down"></i>
        </div>
      </div>

      {/* Контент: при скролле наезжает поверх видео */}
      <div className="Dashboard-Content">
        <div className="Response">
          <div className="Response-Head">
            <i className="bx bx-plus"></i>
            <h1>Оформить заявку</h1>
          </div>
          <div className="Response-ADD">
            <button onClick={() => setIsModalOpen(true)}>Обратиться</button>
          </div>
        </div>

        <div className="Response">
          <div className="Response-Head">
            <i className="bx bx-file"></i>
            <h1>Мои заявки</h1>
          </div>
          <div className="Response-ADD">
            <button onClick={() => setUserApplications(true)}>Посмотреть</button>
          </div>
        </div>

        <div className="Response">
          <div className="Response-Head">
            <i className="bx bx-search-alt-2"></i>
            <h1>Найти заявку по номеру</h1>
          </div>
          <div className="Response-ADD">
            <button onClick={() => setSearchApplication(true)}>Найти</button>
          </div>
        </div>
      </div>

      {/* Блок, к которому скроллит кнопка «Начать» */}
      <div className="Info" ref={infoRef}>
        <div className="InfoHead">
          <h1>Дома доступные к заявкам</h1>
        </div>
        <div className="Info_Homes">
          <i className="bx bx-info-circle"></i>
          <h1>В данный момент доступны заявки по дому Чечерский проезд 122 корпус 1</h1>
        </div>
      </div>

      {/* ===== Модальные окна ===== */}
      {isModalOpen && <RequestModal onClose={() => setIsModalOpen(false)} />}
      {isUserApplications && <User_Applications onClose={() => setUserApplications(false)} />}
      {isSearchApplication && <Search_Application onClose={() => setSearchApplication(false)} />}
    </div>
  );
}

function Applications() {
  const isAllowed = useSessionGuard('administrator'); // доступен только для admin
  // === Поэтапный статус: created → in_progress → completed ===
  const [status, setStatus] = useState('created');

  // === Заготовка под изображения ===
  const [images, setImages] = useState([]);
  const fileInputRef = useRef(null);

  const STATUS = {
    created:     { label: 'Оформлено',             className: 'status-created' },
    in_progress: { label: 'В работе',              className: 'status-in_progress' },
    completed:   { label: 'Исполнение утверждено', className: 'status-completed' },
  };

  const steps = [
    { key: 'created',     label: 'Оформлено',  icon: 'bx-edit-alt' },
    { key: 'in_progress', label: 'В работе',   icon: 'bx-time-five' },
    { key: 'completed',   label: 'Утверждено', icon: 'bx-check-circle' },
  ];
  const stepIndex = steps.findIndex((s) => s.key === status);

  // Загрузка нескольких фото (локально через FileReader-ссылки;
  // при подключении бэкенда достаточно заменить на массив URL с сервера)
  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImages((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  

  return (
    <div className='Applications_Main_Container'>
      {/* ===== Левая панель (без изменений) ===== */}
      <div className='ALL-Applications'>
        <div className='Head-Main'>
          <i className='bx bxs-city'></i>
          <h1>Cube</h1>
        </div>
        <div className='Applications-ALL_BTHS'>
          <button className='active'>Заявка <i className="bx bx-hash"></i> 198210</button>
          <button>Заявка <i className="bx bx-hash"></i> 198210</button>
          <button>Заявка <i className="bx bx-hash"></i> 198210</button>
        </div>
      </div>

      {/* ===== Правая панель — карточка заявки ===== */}
      <div className='Application-ALL-Right_container'>
        <div className='Application-Container-Information'>

          {/* Шапка карточки + статус-бейдж */}
          <div className='Application-Head'>
            <h1><i className="bx bx-hash"></i> Заявка № 198210</h1>
            <span key={status} className={`Status-Badge ${STATUS[status].className}`}>
              <span className="Status-Dot"></span>
              {STATUS[status].label}
            </span>
          </div>

          {/* Степпер этапов выполнения */}
          <div className="Status-Stepper">
            {steps.map((s, i) => (
              <React.Fragment key={s.key}>
                {i > 0 && (
                  <div className={`Stepper-Line ${i <= stepIndex ? 'filled' : ''}`} />
                )}
                <div className={`Stepper-Step ${i < stepIndex ? 'done' : ''} ${i === stepIndex ? 'active' : ''}`}>
                  <div className="Stepper-Dot"><i className={`bx ${s.icon}`}></i></div>
                  <span>{s.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Основная информация */}
          <div className="Application-Rows">
            <div className="Application-Row">
              <i className="bx bx-user"></i>
              <div>
                <div className="Row-Label">Отправитель</div>
                <div className="Row-Value">Дмитрий Худов</div>
              </div>
            </div>
            <div className="Application-Row">
              <i className="bx bx-envelope"></i>
              <div>
                <div className="Row-Label">Почта</div>
                <div className="Row-Value">Dmitry3@gmail.com</div>
              </div>
            </div>
            <div className="Application-Row">
              <i className="bx bx-category"></i>
              <div>
                <div className="Row-Label">Категория</div>
                <div className="Row-Value">Уборка</div>
              </div>
            </div>
          </div>

          {/* Фотографии (заготовка под несколько изображений) */}
          <div className="Application-Photos">
            <div className="Photos-Head">
              <h3><i className="bx bx-images"></i> Фотографии <em>({images.length})</em></h3>
            </div>

            <div className="Photos-Grid">
              {images.map((src, idx) => (
                <div className="Photo-Item" key={idx}>
                  <img src={src} alt={`Фото ${idx + 1}`} />
                  <button type="button" className="Photo-Remove" onClick={() => removeImage(idx)}>
                    <i className="bx bx-x"></i>
                  </button>
                </div>
              ))}

              <div className="Photo-Add" onClick={() => fileInputRef.current?.click()}>
                <i className="bx bx-plus"></i>
                <span>Добавить фото</span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              style={{ display: 'none' }}
            />
          </div>

          {/* Описание проблемы */}
          <div className="Application-Description">
            <div className="Desc-Label"><i className="bx bx-message-detail"></i> Описание</div>
            <p>Добрый день! У нас плохо убрались, пожалуйста, исправьте.</p>
          </div>

          {/* Поэтапные действия */}
          <div className="Application-Actions">
            {status === 'created' && (
              <button className="Action-Btn Action-Btn_Work" onClick={() => setStatus('in_progress')}>
                <i className="bx bx-briefcase-alt"></i> Принять в работу
              </button>
            )}
            {status === 'in_progress' && (
              <button className="Action-Btn Action-Btn_Done" onClick={() => setStatus('completed')}>
                <i className="bx bx-check-double"></i> Утвердить исполнение
              </button>
            )}
            {status === 'completed' && (
              <div className="Completed-Note">
                <i className="bx bx-check-circle"></i> Заявка закрыта — исполнение утверждено
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ========================================
// === ГЛАВНЫЙ КОМПОНЕНТ С РОУТАМИ ========
// ========================================
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/applications" element={<Applications/>}/>
      </Routes>
    </Router>
  );
}

export default App;