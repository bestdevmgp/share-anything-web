import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const DownloadPage: React.FC = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus on first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleInputChange = (index: number, value: string) => {
    // Only allow alphanumeric characters
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (sanitized.length > 1) {
      // If pasting multiple characters
      const chars = sanitized.split('');
      const newCode = [...code];
      chars.forEach((char, i) => {
        if (index + i < 6) {
          newCode[index + i] = char;
        }
      });
      setCode(newCode);

      // Focus on the next empty input or last input
      const nextIndex = Math.min(index + chars.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else if (sanitized.length === 1) {
      const newCode = [...code];
      newCode[index] = sanitized;
      setCode(newCode);

      // Move to next input
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (code[index] === '') {
        // If current input is empty, move to previous
        if (index > 0) {
          inputRefs.current[index - 1]?.focus();
        }
      } else {
        // Clear current input
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      toast.error('6자리 코드를 모두 입력해주세요');
      return;
    }

    navigate(`/download/${fullCode}`);
  };

  const isComplete = code.every(char => char !== '');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-3xl border-2 border-gray-200 p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">파일 다운로드</h1>
            <p className="text-gray-600">전달받은 6자리 키를 입력하세요</p>
          </div>

          {/* Code Input */}
          <div className="mb-6">
            <div className="flex justify-center space-x-2 md:space-x-3 mb-4">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { inputRefs.current[index] = el; }}
                  type="text"
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  maxLength={1}
                  className="w-10 h-12 md:w-14 md:h-16 text-center text-xl md:text-2xl font-bold border-2 border-blue-500 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-600 outline-none transition-all uppercase"
                />
              ))}
            </div>
            <p className="text-center text-sm text-gray-500">

            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!isComplete}
            className="w-full px-6 py-3 md:py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mb-4"
          >
            다운로드
          </button>

          {/* Link to Upload */}
          <div className="text-center">
            <button
              onClick={() => navigate('/upload')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              파일 보내기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage;
