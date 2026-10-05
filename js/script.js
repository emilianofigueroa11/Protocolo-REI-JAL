/**
 * RE-JAL Protocol Management Module
 * Este archivo contiene la lógica de negocio para la captura y exportación
 * de protocolos de la Secretaría de Salud Jalisco.
 */

  const { jsPDF } = window.jspdf;

  const ids = ['titulo', 'planteamiento', 'objetivoGeneral', 'disenoSelect', 'metodos', 'institucion', 'folio', 'financiamiento'];
  const labels = {
    titulo: "1. Título",
    planteamiento: "2. Planteamiento del problema",
    objetivoGeneral: "3. Objetivo general",
    disenoSelect: "4. Diseño",
    metodos: "5. Métodos",
    institucion: "6. ¿En dónde se implementará?",
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

  // Utilidad: Escapar texto del usuario antes de insertarlo como HTML
  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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
      html += `<div class="doc-label">${labels[id]}</div><div class="doc-value">${escapeHtml(displayVal)}</div>`;
    });

    const statusEl = document.getElementById('conflictoStatus');
    const detalleEl = document.getElementById('conflictoDetalle');

    const confVal = (statusEl && statusEl.value === 'Si existe conflicto')
                    ? (detalleEl ? detalleEl.value : "")
                    : "No existe conflicto de interés";
    html += `<div class="doc-label">${labels.conflicto}</div><div class="doc-value">${escapeHtml(confVal || 'Sin detalle')}</div>`;

    const selected = Array.from(document.querySelectorAll('.ods-item.selected')).map(el => {
      const data = odsData.find(o => o.n === parseInt(el.dataset.n));
      return `<span class="ods-preview-badge" style="background:${data.c}">${data.n}. ${data.t}</span>`;
    });
    html += `<div class="doc-label">10. Objetivos de Desarrollo Sostenible</div><div class="doc-value">${selected.join('') || '[Sin selección]'}</div>`;
    prev.innerHTML = html;
  }

  // Carga el logo reducido (máx. 600 px de ancho) y su proporción alto/ancho.
  // Si el navegador bloquea el canvas (p. ej. al abrir el archivo con file://),
  // devuelve null y el PDF se genera sin logo en lugar de quedarse colgado.
  function getLogoForPdf() {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, 600 / img.naturalWidth);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.naturalWidth * scale);
          canvas.height = Math.round(img.naturalHeight * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve({
            data: canvas.toDataURL('image/png'),
            ratio: img.naturalHeight / img.naturalWidth
          });
        } catch (e) {
          console.warn("No se pudo procesar el logo para el PDF:", e);
          resolve(null);
        }
      };
      img.onerror = () => {
        console.warn("No se pudo cargar el logo para el PDF.");
        resolve(null);
      };
      img.src = "img/logo.png";
    });
  }

  document.getElementById('btnPdf').addEventListener('click', async () => {

  const camposObligatorios = [
    {
      id: 'titulo',
      mensaje: 'El Título del Protocolo es obligatorio'
    },
    {
      id: 'planteamiento',
      mensaje: 'El Planteamiento del problema es obligatorio'
    },
    {
      id: 'objetivoGeneral',
      mensaje: 'El Objetivo general es obligatorio'
    },
    {
      id: 'disenoSelect',
      mensaje: 'Debe seleccionar un Diseño de Estudio'
    },
    {
      id: 'metodos',
      mensaje: 'Los Métodos son obligatorios'
    },
    {
      id: 'institucion',
      mensaje: 'La Institución a implementar es obligatoria'
    },
    {
      id: 'folio',
      mensaje: 'El Número de aprobación es obligatorio'
    },
    {
      id: 'financiamiento',
      mensaje: 'El Financiamiento es obligatorio'
    }
  ];

  for (const campo of camposObligatorios) {

    const elemento = document.getElementById(campo.id);

    if (!elemento || !elemento.value.trim()) {

      showToast(campo.mensaje, "error");

      elemento.focus();

      return;
    }
  }

  // Validar conflicto de interés
  const conflictoStatus =
    document.getElementById('conflictoStatus');

  const conflictoDetalle =
    document.getElementById('conflictoDetalle');

  if (
    conflictoStatus.value === 'Si existe conflicto' &&
    !conflictoDetalle.value.trim()
  ) {

    showToast(
      "Debe especificar el conflicto de interés",
      "error"
    );

    conflictoDetalle.focus();

    return;
  }

    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'flex';

    try {
      const doc = new jsPDF();
      const m = 25;
      const textWidth = 160;
      const lineHeight = 5;
      let y = 30;

      // Logo con su proporción original (sin deformar)
      const logo = await getLogoForPdf();
      if (logo) {
        const logoWidth = 25;
        doc.addImage(logo.data, 'PNG', 160, 15, logoWidth, logoWidth * logo.ratio);
      }

      doc.setTextColor(22, 101, 52);
      doc.setFont("helvetica", "bold"); doc.setFontSize(14);
      doc.text("Salud", m, 25);

      doc.setTextColor(0); doc.setFontSize(11);
      doc.text("Registro Estatal de Protocolos del Estado de Jalisco", 105, 40, {align: 'center'});
      doc.text("Resumen Inicial", 105, 46, {align: 'center'});

      y = 60;

      const checkSpace = (needed) => {
        if (y + needed > 275) {
          doc.addPage();
          // Re-imprimir cabecera mínima en nueva página
          doc.setTextColor(22, 101, 52); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
          doc.text("Salud - Registro de Protocolos", m, 15);
          doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
          y = 30;
        }
      };

      // Escribe el texto justificado línea por línea, saltando de página cuando
      // hace falta. La última línea de cada párrafo queda alineada a la izquierda.
      const writeJustified = (text) => {
        text.split('\n').forEach(paragraph => {
          const lines = paragraph.trim() ? doc.splitTextToSize(paragraph.trim(), textWidth) : [''];
          lines.forEach((line, i) => {
            checkSpace(lineHeight);
            const words = line.trim().split(/\s+/);
            const isLastLine = i === lines.length - 1;

            if (isLastLine || words.length < 2) {
              doc.text(line.trim(), m, y);
            } else {
              const wordsWidth = words.reduce((sum, w) => sum + doc.getTextWidth(w), 0);
              const gap = (textWidth - wordsWidth) / (words.length - 1);
              let x = m;
              words.forEach(w => {
                doc.text(w, x, y);
                x += doc.getTextWidth(w) + gap;
              });
            }
            y += lineHeight;
          });
        });
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

        // Etiqueta + al menos dos líneas de texto en la misma página
        checkSpace(6 + lineHeight * 2);

        doc.setFontSize(9); doc.setFont("helvetica", "bold");
        doc.text(labels[id] || id, m, y); y += 6;
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        writeJustified(val.trim() || "N/A");
        y += 8;
      });

      // ODS Gráficos
      checkSpace(30);
      doc.setFontSize(9); doc.setFont("helvetica", "bold");
      doc.text("10. Objetivos de Desarrollo Sostenible (Agenda 2030):", m, y); y += 10;
      doc.setFont("helvetica", "normal");

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
          doc.text(data.t, xPos + 10, y);
          xPos += 45;
        }
      });

      doc.save("Resumen_Inicial_SSJ_Jalisco.pdf");
      showToast("PDF generado correctamente", "success");
    } catch (e) {
      console.error("Error al generar el PDF:", e);
      showToast("Ocurrió un error al generar el PDF", "error");
    } finally {
      overlay.style.display = 'none';
    }
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
