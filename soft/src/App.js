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
    name: '',
    phone: '',
    address: '',
    category: 'Сантехника',
    description: '',
  });
  const [submitted, setSubmitted] = useState(false);

  // Закрытие по Esc + блокировка скролла фона, пока окно открыто
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Заявка отправлена:', formData);
    setSubmitted(true); // показываем экран успеха
  };

  return (
    <div className="Modal-Overlay" onClick={onClose}>
      <div className="Modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="Modal-Close" onClick={onClose} aria-label="Закрыть">
          <i className="bx bx-x"></i>
        </button>

        {submitted ? (
          <div className="Modal-Success">
            <i className="bx bx-check-circle"></i>
            <h2>Заявка № успешно оформлена!</h2>
            <p>Мы получили ваше обращение и отреагируем в кратчайший срок.</p>
            <button type="button" onClick={onClose}>Отлично</button>
          </div>
        ) : (
          <>
            <div className="Modal-Header">
              <i className="bx bx-edit-alt"></i>
              <h1>Оформить заявку</h1>
              <p>Заполните форму и следите за статусом выполнения</p>
            </div>

            <form className="Modal-Form" onSubmit={handleSubmit}>
              <div className="Modal-Field">
                <label htmlFor="req-category">Подьезд</label>
                <div className="Modal-InputWrap">
                  <i className="bx bx-category"></i>
                  <select id="req-category" name="category"
                          value={formData.category} onChange={handleChange}>
                    <option>1</option>
                    <option>2</option>
                    <option>3</option>
                    <option>4</option>
                    <option>5</option>
                    <option>6</option>
                    <option>Улица</option>
                  </select>
                  <i className="bx bx-chevron-down Modal-SelectArrow"></i>
                </div>
              </div>

              <div className="Modal-Field">
                <label htmlFor="req-category">Этаж</label>
                <div className="Modal-InputWrap">
                  <i className="bx bx-category"></i>
                  <select id="req-category" name="category"
                          value={formData.category} onChange={handleChange}>
                    <option>1</option>
                    <option>2</option>
                    <option>3</option>
                    <option>4</option>
                    <option>5</option>
                    <option>6</option>
                    <option>7</option>
                    <option>8</option>
                    <option>9</option>
                    <option>10</option>
                    <option>11</option>
                    <option>12</option>
                    <option>13</option>
                    <option>14</option>
                    <option>15</option>
                    <option>16</option>
                    <option>17</option>
                    <option>Другой</option>
                  </select>
                  <i className="bx bx-chevron-down Modal-SelectArrow"></i>
                </div>
              </div>

              <div className="Modal-Field">
                <label htmlFor="req-category">Категория</label>
                <div className="Modal-InputWrap">
                  <i className="bx bx-category"></i>
                  <select id="req-category" name="category"
                          value={formData.category} onChange={handleChange}>
                    <option>Уборка</option>
                  </select>
                  <i className="bx bx-chevron-down Modal-SelectArrow"></i>
                </div>
              </div>

              <div className="Modal-Field">
                <label htmlFor="req-desc">Описание проблемы</label>
                <div className="Modal-InputWrap Modal-InputWrap_Textarea">
                  <i className="bx bx-message-detail"></i>
                  <textarea id="req-desc" name="description"
                            placeholder="Опишите проблему ..."
                            value={formData.description} onChange={handleChange} required></textarea>
                </div>
              </div>

              <button type="submit" className="Modal-Submit">
                <i className="bx bx-send"></i>
                Отправить заявку
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
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="Modal-Overlay" onClick={onClose}>
      <div className="Modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="Modal-Close" onClick={onClose} aria-label="Закрыть">
          <i className="bx bx-x"></i>
        </button>
        <div className="Modal-Header">
          <i className="bx bx-file"></i>
          <h1>Мои заявки</h1>
          <p>Список ваших обращений и их статусы</p>
        </div>
        {/* Здесь будет контент ваших заявок */}
      </div>
    </div>
  );
}

// ========================================
// === Search Application =================
// ========================================
function Search_Application({ onClose }) {
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="Modal-Overlay" onClick={onClose}>
      <div className="Modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="Modal-Close" onClick={onClose} aria-label="Закрыть">
          <i className="bx bx-x"></i>
        </button>
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
              placeholder="Например: 0001"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
        </div>
        <button type="button" className="Modal-Submit">
          <i className="bx bx-search"></i>
          Найти
        </button>
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

  // Пока проверка не завершена — не рендерим страницу
  if (!isAllowed) return null;

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