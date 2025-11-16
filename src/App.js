import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAJOhVQSYf-4GIyGnFiRpChjb0FuzPdjBk",
  authDomain: "njob-income-tracker.firebaseapp.com",
  projectId: "njob-income-tracker",
  storageBucket: "njob-income-tracker.firebasestorage.app",
  messagingSenderId: "176646550330",
  appId: "1:176646550330:web:33ca6599dd6c3069ee5603"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function SideIncomeTracker() {
  const [activeTab, setActiveTab] = useState('graph');
  const [incomes, setIncomes] = useState([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('본업');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyHours, setMonthlyHours] = useState('');
  const [taxRate, setTaxRate] = useState('3.3');
  const [editingId, setEditingId] = useState(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [tempYear, setTempYear] = useState(null);
  const [tempMonth, setTempMonth] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [minLoadingTime, setMinLoadingTime] = useState(true);

  // 로그인 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const nickname = generateNickname(firebaseUser.uid);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          nickname: nickname
        });
        
        await loadDataFromFirestore(firebaseUser.uid);
      } else {
        setUser(null);
        loadDataFromLocalStorage();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 스플래시 화면 최소 2초 보장
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingTime(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // 토스트 알림 표시
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTypeDropdown && !event.target.closest('[data-dropdown]')) {
        setShowTypeDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showTypeDropdown]);

  // localStorage에서 데이터 불러오기
  const loadDataFromLocalStorage = () => {
    const savedIncomes = localStorage.getItem('njob-incomes');
    if (savedIncomes) {
      try {
        setIncomes(JSON.parse(savedIncomes));
      } catch (e) {
        console.error('데이터 로드 실패:', e);
      }
    }
  };

  // Firestore에서 데이터 불러오기
  const loadDataFromFirestore = async (uid) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIncomes(data.incomes || []);
        localStorage.setItem('njob-incomes', JSON.stringify(data.incomes || []));
      } else {
        const localData = localStorage.getItem('njob-incomes');
        if (localData) {
          const parsedData = JSON.parse(localData);
          setIncomes(parsedData);
          await saveDataToFirestore(uid, parsedData);
        }
      }
    } catch (error) {
      console.error('Firestore 데이터 로드 실패:', error);
      loadDataFromLocalStorage();
    }
  };

  // Firestore에 데이터 저장
  const saveDataToFirestore = async (uid, data) => {
    try {
      const docRef = doc(db, 'users', uid);
      await setDoc(docRef, {
        incomes: data,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Firestore 저장 실패:', error);
    }
  };

  // incomes 변경될 때마다 저장
  useEffect(() => {
    if (loading) return;
    
    localStorage.setItem('njob-incomes', JSON.stringify(incomes));
    
    if (user) {
      saveDataToFirestore(user.uid, incomes);
    }
  }, [incomes, user, loading]);

  // 랜덤 닉네임 생성 (UID 뒷 4자리로 유니크 보장)
  const generateNickname = (uid) => {
    const adjectives = ['말랑한', '귀여운', '상큼한', '활발한', '조용한', '멋진', '용감한', '영리한', '친절한', '똑똑한'];
    const nouns = ['세탁기', '냉장고', '선풍기', '청소기', '토스터', '믹서기', '에어컨', '다리미', '전자레인지', '커피머신'];
    
    const hash = uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const adj = adjectives[hash % adjectives.length];
    const noun = nouns[(hash * 7) % nouns.length];
    const uniqueId = uid.slice(-4);
    
    return `${adj}${noun}_${uniqueId}`;
  };

  // 구글 로그인
  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      showToast('로그인되었습니다.', 'success');
    } catch (error) {
      console.error('로그인 실패:', error);
      showToast('로그인에 실패했습니다. 다시 시도해주세요.', 'error');
    }
  };

  // 로그아웃
  const handleLogout = async () => {
    try {
      showToast('로그아웃되었습니다.', 'success');
      // 토스트가 보이도록 약간 지연 후 로그아웃
      setTimeout(async () => {
        await signOut(auth);
      }, 500);
    } catch (error) {
      console.error('로그아웃 실패:', error);
      showToast('로그아웃에 실패했습니다.', 'error');
    }
  };
  
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };
  
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const openMonthPicker = () => {
    const [year, month] = selectedMonth.split('-');
    setTempYear(parseInt(year));
    setTempMonth(parseInt(month));
    setShowMonthPicker(true);
  };

  const confirmMonthSelection = () => {
    setSelectedMonth(`${tempYear}-${String(tempMonth).padStart(2, '0')}`);
    setShowMonthPicker(false);
  };

  const calculateAfterTax = (income, rate) => {
    return Math.round(income * (1 - rate / 100));
  };

  const calculateHourlyRate = (income, hours) => {
    if (hours === 0) return 0;
    return Math.round(income / hours);
  };

  const handleAddIncome = () => {
    if (!name || !monthlyIncome || !monthlyHours || !taxRate) {
      showToast('모든 항목을 입력해주세요!', 'error');
      return;
    }

    const currentMonth = getCurrentMonth();
    const incomeData = {
      monthlyIncome: Number(monthlyIncome),
      monthlyHours: Number(monthlyHours),
      taxRate: Number(taxRate)
    };

    if (editingId) {
      setIncomes(incomes.map(income => {
        if (income.id === editingId) {
          const newHistory = [...income.history];
          const currentMonthIndex = newHistory.findIndex(h => h.validFrom === currentMonth);
          if (currentMonthIndex >= 0) {
            newHistory[currentMonthIndex] = { validFrom: currentMonth, ...incomeData };
          } else {
            newHistory.push({ validFrom: currentMonth, ...incomeData });
          }
          
          return {
            ...income,
            name: name,
            type: type,
            history: newHistory.sort((a, b) => a.validFrom.localeCompare(b.validFrom))
          };
        }
        return income;
      }));
      setEditingId(null);
    } else {
      const newIncome = {
        id: Date.now(),
        name: name,
        type: type,
        createdAt: currentMonth,
        deletedAt: null,
        history: [{
          validFrom: currentMonth,
          ...incomeData
        }]
      };
      setIncomes([...incomes, newIncome]);
    }

    setName('');
    setType('본업');
    setMonthlyIncome('');
    setMonthlyHours('');
    setTaxRate('3.3');
    setActiveTab('graph');
  };

  const handleEdit = (income) => {
    const currentData = getIncomeDataForMonth(income, getCurrentMonth());
    setName(income.name);
    setType(income.type);
    setMonthlyIncome(currentData.monthlyIncome.toString());
    setMonthlyHours(currentData.monthlyHours.toString());
    setTaxRate(currentData.taxRate.toString());
    setEditingId(income.id);
    setActiveTab('add');
  };

  const handleCancelEdit = () => {
    setName('');
    setType('본업');
    setMonthlyIncome('');
    setMonthlyHours('');
    setTaxRate('3.3');
    setEditingId(null);
  };
  
  const deleteIncome = (id) => {
    const currentMonth = getCurrentMonth();
    setIncomes(incomes.map(income => 
      income.id === id 
        ? { ...income, deletedAt: currentMonth }
        : income
    ));
  };
  
  const getIncomeDataForMonth = (income, month) => {
    const validHistory = income.history
      .filter(h => h.validFrom <= month)
      .sort((a, b) => b.validFrom.localeCompare(a.validFrom));
    
    if (validHistory.length === 0) return null;
    
    const data = validHistory[0];
    return {
      ...data,
      afterTax: calculateAfterTax(data.monthlyIncome, data.taxRate),
      hourlyRate: calculateHourlyRate(data.monthlyIncome, data.monthlyHours)
    };
  };
  
  const getIncomesForMonth = (month) => {
    return incomes
      .filter(income => {
        if (income.createdAt > month) return false;
        if (income.deletedAt && income.deletedAt <= month) return false;
        return true;
      })
      .map(income => ({
        ...income,
        ...getIncomeDataForMonth(income, month)
      }))
      .filter(income => income.monthlyIncome !== undefined);
  };
  
  const getAvailableMonths = () => {
    if (incomes.length === 0) return [];
    
    const currentMonth = getCurrentMonth();
    const earliestMonth = incomes.reduce((earliest, income) => 
      income.createdAt < earliest ? income.createdAt : earliest
    , currentMonth);
    
    const months = [];
    let [year, month] = earliestMonth.split('-').map(Number);
    const [currentYear, currentMonthNum] = currentMonth.split('-').map(Number);
    
    while (year < currentYear || (year === currentYear && month <= currentMonthNum)) {
      months.push(`${year}-${String(month).padStart(2, '0')}`);
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
    
    return months.reverse();
  };
  
  const filteredIncomes = getIncomesForMonth(selectedMonth);
  const totalBeforeTax = filteredIncomes.reduce((sum, income) => sum + income.monthlyIncome, 0);
  const totalAfterTax = filteredIncomes.reduce((sum, income) => sum + income.afterTax, 0);
  const sortedByHourlyRate = [...filteredIncomes].sort((a, b) => b.hourlyRate - a.hourlyRate);
  const colors = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#FB923C'];
  
  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    return `${year}년 ${parseInt(month)}월`;
  };

  if (loading || minLoadingTime) {
    return (
      <div style={{
        fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif",
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#60A5FA',
        flexDirection: 'column'
      }}>
        <style>{`
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          .splash-logo {
            animation: pulse 2s ease-in-out infinite;
          }
          .splash-text {
            animation: fadeIn 1s ease-out;
          }
        `}</style>
        <div style={{ textAlign: 'center' }}>
          <div className="splash-logo" style={{ fontSize: '80px', marginBottom: '24px' }}>
            💰
          </div>
          <h1 className="splash-text" style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: 'white', 
            marginBottom: '12px',
            letterSpacing: '-0.5px'
          }}>
            N잡 수입 관리
          </h1>
          <p className="splash-text" style={{ 
            fontSize: '15px', 
            color: 'rgba(255,255,255,0.8)',
            fontWeight: '400'
          }}>
            당신의 모든 수입을 한눈에
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif",
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f8fafc'
    }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        * {
          box-sizing: border-box;
        }
        input, select {
          box-sizing: border-box;
        }
        @keyframes toastIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes toastOut {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.9);
          }
        }
        .toast-enter {
          animation: toastIn 0.3s ease-out forwards;
        }
        .toast-exit {
          animation: toastOut 0.3s ease-in forwards;
        }
      `}</style>

      <header style={{
        padding: '20px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
          💰 N잡 수입 관리
        </h1>
      </header>

      <main style={{ flex: 1, overflow: 'auto', paddingBottom: '80px' }}>
        {showMonthPicker && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'flex-end',
            zIndex: 1000
          }} onClick={() => setShowMonthPicker(false)}>
            <div style={{
              backgroundColor: 'white',
              width: '100%',
              borderRadius: '20px 20px 0 0',
              padding: '24px',
              maxHeight: '400px'
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                  기간 선택
                </h3>
                <button
                  onClick={() => setShowMonthPicker(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#6b7280' }}>
                    년도
                  </label>
                  <div style={{
                    height: '150px',
                    overflowY: 'scroll',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '8px'
                  }}>
                    {[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                      <div
                        key={year}
                        onClick={() => setTempYear(year)}
                        style={{
                          padding: '12px',
                          textAlign: 'center',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: tempYear === year ? '#eff6ff' : 'transparent',
                          color: tempYear === year ? '#60A5FA' : '#374151',
                          fontWeight: tempYear === year ? '600' : '400',
                          marginBottom: '4px'
                        }}
                      >
                        {year}년
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#6b7280' }}>
                    월
                  </label>
                  <div style={{
                    height: '150px',
                    overflowY: 'scroll',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '8px'
                  }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                      <div
                        key={month}
                        onClick={() => setTempMonth(month)}
                        style={{
                          padding: '12px',
                          textAlign: 'center',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: tempMonth === month ? '#eff6ff' : 'transparent',
                          color: tempMonth === month ? '#60A5FA' : '#374151',
                          fontWeight: tempMonth === month ? '600' : '400',
                          marginBottom: '4px'
                        }}
                      >
                        {month}월
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={confirmMonthSelection}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#60A5FA',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                확인
              </button>
            </div>
          </div>
        )}

        {activeTab === 'add' && (
          <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#1f2937' }}>
                {editingId ? '수입원 수정' : '새 수입원 추가'}
              </h2>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                  이름
                </label>
                <input
                  type="text"
                  placeholder="예: 블로그 애드센스"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#60A5FA'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                  구분
                </label>
                <div style={{ position: 'relative' }} data-dropdown>
                  <div
                    onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '12px',
                      fontSize: '15px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxSizing: 'border-box',
                      fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif"
                    }}
                  >
                    <span style={{ color: '#1f2937' }}>{type}</span>
                    <svg 
                      width="20" 
                      height="20" 
                      viewBox="0 0 20 20" 
                      fill="none"
                      style={{
                        transform: showTypeDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }}
                    >
                      <path 
                        d="M5 7.5L10 12.5L15 7.5" 
                        stroke="#60A5FA" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  {showTypeDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        zIndex: 10,
                        overflow: 'hidden'
                      }}
                    >
                      {['본업', '부업'].map((option) => (
                        <div
                          key={option}
                          onClick={() => {
                            setType(option);
                            setShowTypeDropdown(false);
                          }}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            backgroundColor: type === option ? '#eff6ff' : 'white',
                            color: type === option ? '#60A5FA' : '#374151',
                            fontWeight: type === option ? '600' : '400',
                            fontSize: '15px',
                            transition: 'background-color 0.15s',
                            fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif"
                          }}
                          onMouseEnter={(e) => {
                            if (type !== option) {
                              e.target.style.backgroundColor = '#f9fafb';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (type !== option) {
                              e.target.style.backgroundColor = 'white';
                            }
                          }}
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                  세전 월 수입 (원)
                </label>
                <input
                  type="number"
                  placeholder="3000000"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#60A5FA'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                  세금 (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="3.3"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#60A5FA'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                  월 투입 시간
                </label>
                <input
                  type="number"
                  placeholder="160"
                  value={monthlyHours}
                  onChange={(e) => setMonthlyHours(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#60A5FA'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {editingId && (
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      flex: 1,
                      padding: '14px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    취소
                  </button>
                )}
                <button
                  onClick={handleAddIncome}
                  style={{
                    flex: 1,
                    padding: '14px',
                    backgroundColor: '#60A5FA',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {editingId ? '수정하기' : '추가하기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'graph' && (
          <div style={{ padding: '20px' }}>
            {filteredIncomes.length > 0 ? (
              <>
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                      수입원별 비율
                    </h2>
                    {getAvailableMonths().length > 0 && (
                      <button
                        onClick={openMonthPicker}
                        style={{
                          padding: '8px 16px',
                          border: '1px solid #d1d5db',
                          borderRadius: '10px',
                          backgroundColor: 'white',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#374151',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📅 {formatMonth(selectedMonth)}
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredIncomes.map((income, index) => {
                      const percentage = (income.monthlyIncome / totalBeforeTax * 100).toFixed(1);
                      return (
                        <div key={income.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: colors[index % colors.length]
                              }}></div>
                              <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                                {income.name}
                              </span>
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                              {income.monthlyIncome.toLocaleString()}원 ({percentage}%)
                            </span>
                          </div>
                          <div style={{
                            width: '100%',
                            height: '8px',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${percentage}%`,
                              height: '100%',
                              backgroundColor: colors[index % colors.length],
                              transition: 'width 0.3s'
                            }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#1f2937' }}>
                    시간당 수익률 랭킹
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {sortedByHourlyRate.map((income, index) => {
                      const maxRate = sortedByHourlyRate[0].hourlyRate;
                      const percentage = (income.hourlyRate / maxRate * 100);
                      return (
                        <div key={income.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: index === 0 ? '#60A5FA' : '#e5e7eb',
                            color: index === 0 ? 'white' : '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '700',
                            flexShrink: 0
                          }}>
                            {index + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                                {income.name}
                              </span>
                              <span style={{ fontSize: '14px', fontWeight: '700', color: '#60A5FA' }}>
                                {income.hourlyRate.toLocaleString()}원/h
                              </span>
                            </div>
                            <div style={{
                              width: '100%',
                              height: '6px',
                              backgroundColor: '#f3f4f6',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${percentage}%`,
                                height: '100%',
                                backgroundColor: '#60A5FA',
                                transition: 'width 0.3s'
                              }}></div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            <button
                              onClick={() => handleEdit(income)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer'
                              }}
                            >
                              수정
                            </button>
                            <button
                              onClick={() => deleteIncome(income.id)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#fee2e2',
                                color: '#ef4444',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer'
                              }}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '60px 20px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '8px' }}>
                  {incomes.length === 0 
                    ? '아직 등록된 수입원이 없습니다'
                    : `${formatMonth(selectedMonth)}에 등록된 수입원이 없습니다`
                  }
                </p>
                <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                  하단의 + 버튼을 눌러 수입원을 추가해보세요
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div style={{ padding: '20px' }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                  {formatMonth(selectedMonth)} 요약
                </h2>
                {getAvailableMonths().length > 0 && (
                  <button
                    onClick={openMonthPicker}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '10px',
                      backgroundColor: 'white',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    📅
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  padding: '20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>총 수입 (세전)</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937' }}>
                    {totalBeforeTax.toLocaleString()}원
                  </div>
                </div>
                <div style={{
                  padding: '20px',
                  backgroundColor: '#eff6ff',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>총 수입 (세후)</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#60A5FA' }}>
                    {totalAfterTax.toLocaleString()}원
                  </div>
                </div>
                <div style={{
                  padding: '20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>수입원 개수</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937' }}>
                    {filteredIncomes.length}개
                  </div>
                </div>
              </div>
            </div>

            {filteredIncomes.length > 0 && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1f2937' }}>
                  수입원 상세
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sortedByHourlyRate.map((income) => (
                    <div key={income.id} style={{
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                          {income.name}
                        </span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: income.type === '본업' ? '#dbeafe' : '#d1fae5',
                            color: income.type === '본업' ? '#1e40af' : '#065f46'
                          }}>
                            {income.type}
                          </span>
                          <button
                            onClick={() => handleEdit(income)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: 'transparent',
                              color: '#60A5FA',
                              border: '1px solid #60A5FA',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                          >
                            수정
                          </button>
                          <button
                            onClick={() => deleteIncome(income.id)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: 'transparent',
                              color: '#ef4444',
                              border: '1px solid #ef4444',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                        세전 수입: {income.monthlyIncome.toLocaleString()}원
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                        세금: {income.taxRate}% ({Math.round(income.monthlyIncome * income.taxRate / 100).toLocaleString()}원)
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                        세후 수입: {income.afterTax.toLocaleString()}원
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                        월 투입: {income.monthlyHours}시간
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#60A5FA' }}>
                        시간당 {income.hourlyRate.toLocaleString()}원
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'my' && (
          <div style={{ padding: '20px' }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              {user ? (
                <>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    margin: '0 auto 16px',
                    backgroundColor: '#e5e7eb'
                  }}>
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt="프로필" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '36px'
                      }}>
                        👤
                      </div>
                    )}
                  </div>

                  <h3 style={{ 
                    fontSize: '18px', 
                    fontWeight: '700', 
                    color: '#1f2937', 
                    marginBottom: '4px' 
                  }}>
                    {user.nickname}
                  </h3>
                  <p style={{ 
                    fontSize: '14px', 
                    color: '#6b7280', 
                    marginBottom: '24px' 
                  }}>
                    {user.email}
                  </p>

                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      maxWidth: '280px',
                      padding: '14px 24px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      margin: '0 auto'
                    }}
                  >
                    로그아웃
                  </button>

                  <div style={{
                    backgroundColor: '#dcfce7',
                    border: '1px solid #bbf7d0',
                    borderRadius: '12px',
                    padding: '16px',
                    marginTop: '16px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '8px' }}>☁️</div>
                    <p style={{ fontSize: '13px', color: '#166534', lineHeight: '1.5', margin: 0 }}>
                      데이터가 클라우드에 안전하게 저장되고 있어요!<br />
                      어느 기기에서든 로그인하면 동일한 데이터를 볼 수 있습니다.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    fontSize: '36px'
                  }}>
                    👤
                  </div>

                  <h3 style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#1f2937', 
                    marginBottom: '8px' 
                  }}>
                    로그인을 하면 데이터를 유지할 수 있어요!
                  </h3>
                  <p style={{ 
                    fontSize: '14px', 
                    color: '#6b7280', 
                    marginBottom: '24px',
                    lineHeight: '1.5'
                  }}>
                    구글 로그인으로 여러 기기에서<br />
                    동일한 데이터를 사용하세요
                  </p>

                  <button
                    onClick={handleGoogleLogin}
                    style={{
                      width: '100%',
                      maxWidth: '280px',
                      padding: '14px 24px',
                      backgroundColor: 'white',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      margin: '0 auto'
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>🔐</span>
                    구글로 로그인
                  </button>

                  <div style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    borderRadius: '12px',
                    padding: '16px',
                    marginTop: '16px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '8px' }}>💾</div>
                    <p style={{ fontSize: '13px', color: '#92400e', lineHeight: '1.5', margin: 0 }}>
                      현재 데이터는 이 기기에만 저장됩니다.<br />
                      로그인하면 클라우드에 안전하게 보관돼요!
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 토스트 알림 */}
      {toast.show && (
        <div
          className="toast-enter"
          style={{
            position: 'fixed',
            bottom: '110px',
            left: '0',
            right: '0',
            margin: '0 auto',
            width: 'fit-content',
            backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            padding: '14px 20px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            minWidth: '280px',
            maxWidth: 'calc(100% - 40px)',
            textAlign: 'center',
            fontSize: '15px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ fontSize: '18px', flexShrink: 0 }}>
            {toast.type === 'success' ? '✓' : '✕'}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {toast.message}
          </span>
        </div>
      )}

      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 0 12px 0',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
      }}>
        {[
          { id: 'add', icon: '➕', label: '추가' },
          { id: 'graph', icon: '📊', label: '그래프' },
          { id: 'dashboard', icon: '💰', label: '대시보드' },
          { id: 'my', icon: '👤', label: '마이' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <div style={{ fontSize: '24px', opacity: activeTab === tab.id ? 1 : 0.4 }}>
              {tab.icon}
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: '500',
              color: activeTab === tab.id ? '#60A5FA' : '#9ca3af'
            }}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}