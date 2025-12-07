import * as XLSX from 'xlsx';

/**
 * 核心解析逻辑：将 CSV 字符串转换为对象数组
 */
export const parsePlayerData = (csvText) => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  
  const map = {
    id: headers.findIndex(h => h.includes('UID') || h.includes('id')),
    name: headers.findIndex(h => h.includes('昵称') || h.includes('Name')),
    team: headers.findIndex(h => h.includes('战队') || h.includes('Team')),
    maps: headers.findIndex(h => h.includes('场数') || h.includes('Maps')),
    rating: headers.findIndex(h => h.includes('Rating') || h.includes('RT')),
    adr: headers.findIndex(h => h.includes('ADR')),
    rws: headers.findIndex(h => h.includes('Rws') || h.includes('RWS')),
    hs: headers.findIndex(h => h.includes('爆头率') || h.includes('HS')),
    // 【新增】基础数据列，用于计算 K/D 和读取首杀
    k: headers.findIndex(h => h.includes('击杀') || h.includes('Kills')),
    d: headers.findIndex(h => h.includes('死亡') || h.includes('Deaths')),
    fk: headers.findIndex(h => h.includes('首杀') || h.includes('First Kill')), 
  };

  if (map.name === -1) return [];

  return lines.slice(1).map((line, index) => {
    const cols = line.split(',').map(c => c.trim());
    if (!cols[map.name] || cols[map.name] === '') return null;

    // 1. 爆头率处理
    let hsVal = 0;
    let hsDisplay = '-';
    if (map.hs !== -1) {
      let rawHs = cols[map.hs];
      if (rawHs && rawHs.includes('%')) {
        hsVal = parseFloat(rawHs);
        hsDisplay = rawHs;
      } else {
        const floatHs = parseFloat(rawHs);
        if (!isNaN(floatHs)) {
          hsVal = floatHs * 100;
          hsDisplay = (floatHs * 100).toFixed(1) + '%';
        }
      }
    }

    // 2. K/D 计算
    const kills = parseFloat(cols[map.k]) || 0;
    const deaths = parseFloat(cols[map.d]) || 1; // 防止除以0
    const kd = (kills / deaths).toFixed(2);

    // 3. 场均首杀
    const avgFk = parseFloat(cols[map.fk]) || 0;

    return {
      id: (map.id !== -1 && cols[map.id]) ? cols[map.id] : `imported_${Date.now()}_${index}`,
      name: cols[map.name],
      team: cols[map.team] || 'Free Agent',
      maps: map.maps !== -1 ? (parseInt(cols[map.maps]) || 1) : 1,
      rating: parseFloat(cols[map.rating] || 0).toFixed(2),
      adr: parseFloat(cols[map.adr] || 0).toFixed(1),
      rws: parseFloat(cols[map.rws] || 0).toFixed(2),
      hs: hsDisplay,
      hsVal: hsVal, // 数字格式的爆头率，用于画图
      kd: kd,       // 新增 K/D
      fk: avgFk.toFixed(2) // 新增 场均首杀
    };
  }).filter(Boolean).sort((a, b) => b.rating - a.rating);
};

// processFile 函数保持不变，这里省略以节省篇幅...
export const processFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xls') || file.name.endsWith('.xlsx');

    if (isExcel) {
      reader.readAsArrayBuffer(file);
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csvText = XLSX.utils.sheet_to_csv(worksheet);
          const result = parsePlayerData(csvText);
          resolve(result);
        } catch (error) {
          reject(new Error("Excel 解析失败: " + error.message));
        }
      };
    } else {
      reader.readAsText(file);
      reader.onload = (e) => {
        try {
          const result = parsePlayerData(e.target.result);
          resolve(result);
        } catch (error) {
          reject(new Error("CSV 解析失败"));
        }
      };
    }
    reader.onerror = () => reject(new Error("文件读取失败"));
  });
};
