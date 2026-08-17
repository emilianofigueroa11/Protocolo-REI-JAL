/**
 * RE-JAL Protocol Management Module
 * Este archivo contiene la lógica de negocio para la captura y exportación 
 * de protocolos de la Secretaría de Salud Jalisco.
 */


// Configuración de IDs y Etiquetas
const FIELD_IDS = ['titulo', 'planteamiento', 'objetivoGeneral', 'disenoSelect', 'metodos', 'institucion', 'folio', 'financiamiento'];
const LABELS = {
    titulo: "1. Título",
    planteamiento: "2. Planteamiento del problema",
    objetivoGeneral: "3. Objetivo general",
    disenoSelect: "4. Diseño",
    metodos: "5. Métodos",
    institucion: "6. Institución a implementar",
    folio: "7. Número de aprobación",
    financiamiento: "8. Financiamiento",
    conflicto: "9. Conflicto de Interés"
};

// Datos de Objetivos de Desarrollo Sostenible
const ODS_LIST = [
    { n: 1, t: "Fin de la pobreza", c: "#E5243B" }, { n: 2, t: "Hambre cero", c: "#DDA63A" },
    { n: 3, t: "Salud y bienestar", c: "#4C9F38" }, { n: 4, t: "Educación de calidad", c: "#C5192D" },
    { n: 5, t: "Igualdad de género", c: "#FF3A21" }, { n: 6, t: "Agua limpia", c: "#26BDE2" },
    { n: 7, t: "Energía asequible", c: "#FCC30B" }, { n: 8, t: "Trabajo decente", c: "#A21942" },
    { n: 9, t: "Industria e innovación", c: "#FD6925" }, { n: 10, t: "Reducción desigualdades", c: "#DD1367" },
    { n: 11, t: "Ciudades sostenibles", c: "#FD9D24" }, { n: 12, t: "Consumo responsable", c: "#BF8B2E" },
    { n: 13, t: "Acción por el clima", c: "#3F7E44" }, { n: 14, t: "Vida submarina", c: "#0A97D9" },
    { n: 15, t: "Vida terrestre", c: "#56C02B" }, { n: 16, t: "Paz y justicia", c: "#00689D" },
    { n: 17, t: "Alianzas", c: "#19486A" }
];

/**
 * Muestra notificaciones tipo Toast
 */
function showToast(message, type = "success") {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

/**
 * Guarda el progreso actual en LocalStorage
 */
function saveToLocalStorage() {
    const data = {};
    FIELD_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) data[id] = el.value;
    });

    const statusEl = document.getElementById('conflictoStatus');
    const detalleEl = document.getElementById('conflictoDetalle');
    if (statusEl) data['conflictoStatus'] = statusEl.value;
    if (detalleEl) data['conflictoDetalle'] = detalleEl.value;

    data['ods'] = Array.from(document.querySelectorAll('.ods-item.selected')).map(el => el.dataset.n);
    localStorage.setItem('protocoloDraft_SSJ', JSON.stringify(data));
}

/**
 * Carga datos previos si existen
 */
function loadFromLocalStorage() {
    const saved = localStorage.getItem('protocoloDraft_SSJ');
    if (!saved) return;

    try {
        const data = JSON.parse(saved);
        FIELD_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el && data[id]) el.value = data[id];
        });

        const statusEl = document.getElementById('conflictoStatus');
        const detalleEl = document.getElementById('conflictoDetalle');

        if (data['conflictoStatus'] && statusEl) {
            statusEl.value = data['conflictoStatus'];
            if (detalleEl) {
                detalleEl.style.display = data['conflictoStatus'] === 'Si existe conflicto' ? 'block' : 'none';
                detalleEl.value = data['conflictoDetalle'] || '';
            }
        }

        if (data['ods']) {
            data['ods'].forEach(n => {
                const el = document.querySelector(`.ods-item[data-n="${n}"]`);
                if (el) {
                    const odsMatch = ODS_LIST.find(o => o.n == parseInt(n));
                    el.classList.add('selected');
                    el.style.backgroundColor = odsMatch.c;
                }
            });
        }
        if (data['titulo']) showToast("Borrador recuperado correctamente");
    } catch (e) {
        console.error("Error al cargar el borrador:", e);
    }
}

/**
 * Convierte el logo de URL a Base64 para jsPDF
 */
async function getLogoAsBase64(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
    });
}

/**
 * Genera el documento PDF final
 */
async function generateProtocolPDF() {
    const titulo = document.getElementById('titulo').value.trim();
    const diseno = document.getElementById('disenoSelect').value;

    if (!titulo || !diseno) {
        showToast("Por favor llena el título y el diseño de estudio", "error");
        return;
    }

    document.getElementById('loadingOverlay').style.display = 'flex';
    
    const doc = new jsPDF();
    const margin = 25;
    let cursorY = 55;

    const logo = await getLogoAsBase64("img/logo.png");
    if (logo) doc.addImage(logo, 'PNG', 160, 15, 25, 20);

    doc.setTextColor(22, 101, 52);
    doc.setFont("helvetica", "bold").setFontSize(14);
    doc.text("Salud", margin, 25);
    
    doc.setTextColor(0).setFontSize(11);
    doc.text("Registro Estatal de Protocolos del Estado de Jalisco", 105, 40, { align: 'center' });

    const checkPageBreak = (heightNeeded) => {
        if (cursorY + heightNeeded > 275) {
            doc.addPage();
            cursorY = 25;
        }
    };

    // Iterar campos
    [...FIELD_IDS, 'conflicto'].forEach(id => {
        let textValue = "";
        if (id === 'conflicto') {
            const s = document.getElementById('conflictoStatus');
            const d = document.getElementById('conflictoDetalle');
            textValue = s.value === 'Si existe conflicto' ? d.value : s.value;
        } else {
            textValue = document.getElementById(id).value || "N/A";
        }

        const lines = doc.splitTextToSize(textValue, 160);
        checkPageBreak(12 + (lines.length * 5));

        doc.setFontSize(9).setFont("helvetica", "bold");
        doc.text(LABELS[id] || id, margin, cursorY);
        cursorY += 6;
        doc.setFontSize(10).setFont("helvetica", "normal");
        doc.text(lines, margin, cursorY);
        cursorY += (lines.length * 5) + 8;
    });

    // Agregar ODS al final del PDF
    checkPageBreak(30);
    doc.setFontSize(9).setFont("helvetica", "bold");
    doc.text("10. Objetivos de Desarrollo Sostenible:", margin, cursorY);
    cursorY += 10;

    const selectedODS = Array.from(document.querySelectorAll('.ods-item.selected')).map(el => parseInt(el.dataset.n));
    let xPos = margin;
    
    selectedODS.forEach(num => {
        const data = ODS_LIST.find(o => o.n === num);
        if (data) {
            if (xPos > 160) { xPos = margin; cursorY += 12; checkPageBreak(15); }
            doc.setFillColor(data.c);
            doc.rect(xPos, cursorY - 5, 8, 8, 'F');
            doc.setTextColor(255); doc.setFontSize(6);
            doc.text(data.n.toString(), xPos + 4, cursorY, { align: 'center' });
            doc.setTextColor(0); doc.setFontSize(7);
            doc.text(data.t.substring(0, 20), xPos + 10, cursorY);
            xPos += 45;
        }
    });

    document.getElementById('loadingOverlay').style.display = 'none';
    doc.save(`Protocolo_SSJ_${new Date().getTime()}.pdf`);
    showToast("PDF generado con éxito");
}

//script js

  const { jsPDF } = window.jspdf;

  const ids = ['titulo', 'planteamiento', 'objetivoGeneral', 'disenoSelect', 'metodos', 'institucion', 'folio', 'financiamiento'];
  const labels = {
    titulo: "1. Título",
    planteamiento: "2. Planteamiento del problema",
    objetivoGeneral: "3. Objetivo general",
    disenoSelect: "4. Diseño",
    metodos: "5. Métodos",
    institucion: "6. Institución a implementar",
    folio: "7. Número de aprobación",
    financiamiento: "8. Financiamiento",
    conflicto: "9. Conflicto de Interés"
  };

  const odsData = [
    { n: 1, t: "Fin de la pobreza", c: "#E5243B" }, { n: 2, t: "Hambre cero", c: "#DDA63A" },
    { n: 3, t: "Salud y bienestar", c: "#4C9F38" }, { n: 4, t: "Educación de calidad", c: "#C5192D" },
    { n: 5, t: "Igualdad de género", c: "#FF3A21" }, { n: 6, t: "Agua limpia", c: "#26BDE2" },
    { n: 7, t: "Energía asequible", c: "#FCC30B" }, { n: 8, t: "Trabajo decente", c: "#A21942" },
    { n: 9, t: "Industria e innovación", c: "#FD6925" }, { n: 10, t: "Reducción desigualdades", c: "#DD1367" },
    { n: 11, t: "Ciudades sostenibles", c: "#FD9D24" }, { n: 12, t: "Consumo responsable", c: "#BF8B2E" },
    { n: 13, t: "Acción por el clima", c: "#3F7E44" }, { n: 14, t: "Vida submarina", c: "#0A97D9" },
    { n: 15, t: "Vida terrestre", c: "#56C02B" }, { n: 16, t: "Paz y justicia", c: "#00689D" },
    { n: 17, t: "Alianzas", c: "#19486A" }
  ];

  // Utilidad: Mostrar notificaciones Toast
  function showToast(message, type = "success") {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  // Utilidad: Guardar estado en LocalStorage
  function saveState() {
    const data = {};
    ids.forEach(id => {
      const el = document.getElementById(id);
      if(el) data[id] = el.value;
    });
    
    const conflictoStatus = document.getElementById('conflictoStatus');
    const conflictoDetalle = document.getElementById('conflictoDetalle');
    if(conflictoStatus) data['conflictoStatus'] = conflictoStatus.value;
    if(conflictoDetalle) data['conflictoDetalle'] = conflictoDetalle.value;
    
    data['ods'] = Array.from(document.querySelectorAll('.ods-item.selected')).map(el => el.dataset.n);
    localStorage.setItem('protocoloDraft_SSJ', JSON.stringify(data));
  }

  // Utilidad: Cargar estado de LocalStorage
  function loadState() {
    const saved = localStorage.getItem('protocoloDraft_SSJ');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        ids.forEach(id => { 
          const el = document.getElementById(id);
          if(el && data[id]) el.value = data[id]; 
        });
        
        const conflictoStatus = document.getElementById('conflictoStatus');
        const conflictoDetalle = document.getElementById('conflictoDetalle');
        
        if(data['conflictoStatus'] && conflictoStatus) {
          conflictoStatus.value = data['conflictoStatus'];
          if(conflictoDetalle) {
            conflictoDetalle.style.display = data['conflictoStatus'] === 'Si existe conflicto' ? 'block' : 'none';
          }
        }
        if(data['conflictoDetalle'] && conflictoDetalle) {
          conflictoDetalle.value = data['conflictoDetalle'];
        }
        
        if(data['ods']) {
          data['ods'].forEach(n => {
            const el = document.querySelector(`.ods-item[data-n="${n}"]`);
            if(el) {
              el.classList.add('selected');
              el.style.backgroundColor = odsData.find(o => o.n == parseInt(n)).c;
            }
          });
        }
        
        if(data['titulo']) showToast("Borrador automático recuperado", "success");
      } catch(e) { console.error("Error cargando borrador", e); }
    }
  }

  // Utilidad: Actualizar contadores de caracteres
  function updateCounters() {
    ['titulo', 'planteamiento', 'objetivoGeneral', 'metodos'].forEach(id => {
      const el = document.getElementById(id);
      const counter = document.getElementById(`cc-${id}`);
      if(el && counter) {
        counter.innerText = `${el.value.length} / ${el.maxLength}`;
        counter.style.color = el.value.length >= el.maxLength ? '#ef4444' : '#64748b';
      }
    });
  }

  function init() {
    const container = document.getElementById('odsContainer');
    odsData.forEach(ods => {
      const div = document.createElement('div');
      div.className = 'ods-item';
      div.dataset.n = ods.n;
      div.innerHTML = `<span class="ods-icon">${ods.n}</span> ${ods.t}`;
      div.onclick = () => { 
        div.classList.toggle('selected'); 
        div.style.backgroundColor = div.classList.contains('selected') ? ods.c : '#fff';
        updatePreview(); 
        saveState();
      };
      container.appendChild(div);
    });

    ids.forEach(id => {
      const el = document.getElementById(id);
      if(el) {
        el.addEventListener('input', () => {
          if (id === 'disenoSelect') {
            const sel = document.getElementById('disenoSelect');
            const guide = sel.options[sel.selectedIndex].getAttribute('data-guide');
            const box = document.getElementById('equatorInfo');
            if (guide) {
              box.style.display = 'block';
              box.style.backgroundColor = '#f0f9ff';
              box.style.borderColor = '#bae6fd';
              document.getElementById('guideLabel').innerText = `RECOMENDACIÓN EQUATOR: ${guide}`;
            } else {
              box.style.display = 'none';
            }
          }
          updateCounters();
          updatePreview();
          saveState();
        });
      }
    });

    const status = document.getElementById('conflictoStatus');
    const detalle = document.getElementById('conflictoDetalle');
    if (status && detalle) {
      status.addEventListener('change', () => {
        detalle.style.display = status.value === 'Si existe conflicto' ? 'block' : 'none';
        updatePreview();
        saveState();
      });
      detalle.addEventListener('input', () => {
        updatePreview();
        saveState();
      });
    }
    
    // Ejecutar inicializadores
    loadState();
    updateCounters();
    updatePreview();
    
    // Forzar actualización del recuadro EQUATOR al cargar el estado si había algo seleccionado
    const ds = document.getElementById('disenoSelect');
    if(ds) ds.dispatchEvent(new Event('input'));
  }

  function updatePreview() {
    const prev = document.getElementById('prevContent');
    if(!prev) return;
    
    let html = '';
    ids.forEach(id => {
      const el = document.getElementById(id);
      const val = el ? el.value : "";
      const displayVal = val || "[Vacio]";
      html += `<div class="doc-label">${labels[id]}</div><div class="doc-value">${displayVal.replace(/\n/g, '<br>')}</div>`;
    });

    const statusEl = document.getElementById('conflictoStatus');
    const detalleEl = document.getElementById('conflictoDetalle');
    
    const confVal = (statusEl && statusEl.value === 'Si existe conflicto')
                    ? (detalleEl ? detalleEl.value : "") 
                    : "No existe conflicto de interés";
    html += `<div class="doc-label">9. Conflicto de Interés</div><div class="doc-value">${confVal || 'Sin detalle'}</div>`;
    
    const selected = Array.from(document.querySelectorAll('.ods-item.selected')).map(el => {
      const data = odsData.find(o => o.n === parseInt(el.dataset.n));
      return `<span class="ods-preview-badge" style="background:${data.c}">${data.n}. ${data.t}</span>`;
    });
    html += `<div class="doc-label">10. Objetivos de Desarrollo Sostenible</div><div class="doc-value">${selected.join('') || '[Sin selección]'}</div>`;
    prev.innerHTML = html;
  }

  async function getBase64Logo() {
    return new Promise((resolve) => {
      const img = new Image();
      // El proxy o crossorigin es vital para que jsPDF lo lea
      img.src = "img/logo.png";
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        console.warn("No se pudo cargar el logo para el PDF por CORS.");
        resolve(null);
      };
    });
  }

  document.getElementById('btnPdf').addEventListener('click', async () => {
    const tituloEl = document.getElementById('titulo');
    const disenoEl = document.getElementById('disenoSelect');
    
    if (!tituloEl.value.trim()) {
      showToast("El Título del Protocolo es obligatorio", "error");
      tituloEl.focus();
      return;
    }
    if (!disenoEl.value) {
      showToast("Debe seleccionar un Diseño de Estudio", "error");
      disenoEl.focus();
      return;
    }

    document.getElementById('loadingOverlay').style.display = 'flex';
    const doc = new jsPDF();
    const m = 25;
    let y = 30;

    // Obtener Logo con manejo de errores
    const logoBase64 = await getBase64Logo();
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 160, 15, 25, 20);
    }
    
    doc.setTextColor(22, 101, 52);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text("Salud", m, 25);
    
    doc.setTextColor(0); doc.setFontSize(11);
    doc.text("Registro Estatal de Protocolos del Estado de Jalisco", 105, 40, {align: 'center'});
    
    y = 55;

    const checkSpace = (needed) => {
      if (y + needed > 275) {
        doc.addPage();
        y = 25;
        // Re-imprimir cabecera mínima en nueva página
        doc.setTextColor(22, 101, 52); doc.setFontSize(10);
        doc.text("Salud - Registro de Protocolos", m, 15);
        doc.setTextColor(0); y = 30;
      }
    };

    // Procesar campos
    [...ids, 'conflicto'].forEach(id => {
      let val = "";
      if (id === 'conflicto') {
        const statusEl = document.getElementById('conflictoStatus');
        const detalleEl = document.getElementById('conflictoDetalle');
        val = (statusEl && statusEl.value === 'Si existe conflicto') 
              ? (detalleEl ? detalleEl.value : "") 
              : "No existe conflicto de interés";
      } else {
        const el = document.getElementById(id);
        val = el ? el.value : "";
      }
      
      const lines = doc.splitTextToSize(val || "N/A", 160);
      checkSpace(12 + (lines.length * 5));

      doc.setFontSize(9); doc.setFont("helvetica", "bold");
      doc.text(labels[id] || id, m, y); y += 6;
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(lines, m, y);
      y += (lines.length * 5) + 8;
    });

    // ODS Gráficos
    checkSpace(30);
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("10. Objetivos de Desarrollo Sostenible (Agenda 2030):", m, y); y += 10;

    const selectedItems = Array.from(document.querySelectorAll('.ods-item.selected')).map(el => parseInt(el.dataset.n));
    let xPos = m;
    selectedItems.forEach(num => {
      const data = odsData.find(o => o.n === num);
      if(data) {
        if (xPos > 160) { xPos = m; y += 12; checkSpace(15); }

        doc.setFillColor(data.c);
        doc.rect(xPos, y - 5, 8, 8, 'F');
        doc.setTextColor(255); doc.setFontSize(6);
        doc.text(data.n.toString(), xPos + 4, y, {align: 'center'});
        doc.setTextColor(0); doc.setFontSize(7);
        doc.text(data.t.substring(0, 20), xPos + 10, y);
        xPos += 45;
      }
    });

    document.getElementById('loadingOverlay').style.display = 'none';
    doc.save("Resumen_Inicial_SSJ_Jalisco.pdf");
    showToast("PDF generado correctamente", "success");
  });

  document.getElementById('btnReset').onclick = () => {
    if(confirm("¿Estás seguro de que deseas reiniciar? Se borrarán todos los datos capturados.")) {
      localStorage.removeItem('protocoloDraft_SSJ');
      location.reload();
    }
  };

    document.getElementById('btnRegistro').addEventListener('click', () => {

  const titulo = document.getElementById('titulo').value.trim();

  if(!titulo){
    showToast(
      "Primero capture la información del protocolo",
      "error"
    );
    return;
  }


  const continuar = confirm(
    "Recuerde descargar primero el protocolo PDF generado antes de continuar con el registro documental."
  );


  if(continuar){

    const formURL = "https://docs.google.com/forms/d/e/1FAIpQLSe9o_ZokEAM9fhUSIiM7kiFbpBVYSOUtURDM7WjN41SOkdIgQ/viewform?usp=header";

    window.open(formURL, "_blank");

  }

});

  // Iniciar la app
  init();
