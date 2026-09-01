/**
 * Abu Hudhayfah Exchange & Transfers - Formatters & Arabic Number to Words (Tafqeet)
 */

export function formatCurrency(amount, currency = 'YER') {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ' + (currency === 'SAR' ? 'ر.س' : 'ر.ي');
  const formatted = Number(amount).toLocaleString('ar-YE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  const symbol = currency === 'SAR' ? 'ر.س' : 'ر.ي';
  return `${formatted} ${symbol}`;
}

export function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return Number(num).toLocaleString('ar-YE');
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

export function formatDateShort(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return dateString;
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
}

export function getDaysRemaining(endDateStr) {
  if (!endDateStr) return null;
  const target = new Date(endDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffTime = target - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getRelativeTimeArabic(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'منذ لحظات';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays === 1) return 'أمس';
  if (diffDays < 30) return `منذ ${diffDays} يوم`;
  return formatDate(dateString);
}

/**
 * Arabic Number to Words (Tafqeet) for Financial Vouchers & Contracts
 */
export function tafqeetArabic(amount, currency = 'YER') {
  if (!amount || isNaN(amount) || amount === 0) {
    return currency === 'SAR' ? 'فقط صفر ريال سعودي لا غير' : 'فقط صفر ريال يمني لا غير';
  }

  const num = Math.floor(Number(amount));
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroup(n) {
    let res = '';
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const t = Math.floor(rem / 10);
    const o = rem % 10;

    if (h > 0) {
      res += hundreds[h];
    }

    if (rem > 0) {
      if (res.length > 0) res += ' و';
      if (rem < 10) {
        res += ones[rem];
      } else if (rem >= 10 && rem < 20) {
        res += teens[rem - 10];
      } else {
        if (o > 0) {
          res += ones[o] + ' و' + tens[t];
        } else {
          res += tens[t];
        }
      }
    }
    return res;
  }

  let text = '';
  const billions = Math.floor(num / 1000000000);
  const millions = Math.floor((num % 1000000000) / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const units = num % 1000;

  if (billions > 0) {
    text += convertGroup(billions) + (billions === 1 ? ' مليار' : billions === 2 ? ' ملياران' : (billions >= 3 && billions <= 10) ? ' مليارات' : ' مليار');
  }

  if (millions > 0) {
    if (text.length > 0) text += ' و';
    text += convertGroup(millions) + (millions === 1 ? ' مليون' : millions === 2 ? ' مليونان' : (millions >= 3 && millions <= 10) ? ' ملايين' : ' مليون');
  }

  if (thousands > 0) {
    if (text.length > 0) text += ' و';
    if (thousands === 1) text += 'ألف';
    else if (thousands === 2) text += 'ألفان';
    else if (thousands >= 3 && thousands <= 10) text += convertGroup(thousands) + ' آلاف';
    else text += convertGroup(thousands) + ' ألف';
  }

  if (units > 0) {
    if (text.length > 0) text += ' و';
    text += convertGroup(units);
  }

  const currencyName = currency === 'SAR' ? 'ريال سعودي' : 'ريال يمني';
  return `فقط ${text.trim()} ${currencyName} لا غير`;
}
