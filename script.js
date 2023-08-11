// подсос json из локальной папки
const url = "colab_models.json";
// попытка чтобы браузер не брал кешированные данные
fetch(url + '?_=' + new Date().getTime())
  // text вместо data чтобы не ломать кириллицу
  .then((response) => response.text())
  .then((text) => {
    const data = JSON.parse(text);
    // создание элементов для вкладок с категориями
    const container = document.createElement("div");
    container.className = "tabs";
    const nav = document.createElement("div");
    nav.className = "tabs__nav";
    const content = document.createElement("div");
    content.className = "tabs__content";
    for (const category in data.categories) {
      const btn = document.createElement("button");
      btn.className = "tabs__btn";
      btn.textContent = category;
      nav.appendChild(btn);
      const pane = document.createElement("div");
      pane.className = "tabs__pane";
      if (category === "models_A") {
        pane.classList.add("tabs__pane_show");
      }
      data.categories[category].sort().forEach((model) => {
        const label = document.createElement("label");
        label.textContent = model;
        pane.appendChild(label);
      });
      content.appendChild(pane);
    }
    container.appendChild(nav);
    container.appendChild(content);
    // определяем куда вставим элементы на странице (<main id="container" lang="en"></main>)
    const targetElement = document.getElementById("container");
    targetElement.appendChild(container);
    // класс для управления вкладками
    class ItcTabs {
      // инициализация
      constructor(target, config) {
        const defaultConfig = {};
        this._config = Object.assign(defaultConfig, config);
        this._elTabs =
          typeof target === "string" ? document.querySelector(target) : target;
        this._elButtons = this._elTabs.querySelectorAll(".tabs__btn");
        this._elPanes = this._elTabs.querySelectorAll(".tabs__pane");
        this._eventShow = new Event("tab.itc.change");
        this._init();
        this._events();
      }
      // атрибуты доступности
      _init() {
        this._elTabs.setAttribute("role", "tablist");
        this._elButtons.forEach((el, index) => {
          el.dataset.index = index;
          el.setAttribute("role", "tab");
          this._elPanes[index].setAttribute("role", "tabpanel");
        });
      }
      // переключатель активной вкладки
      show(elLinkTarget) {
        const elPaneTarget = this._elPanes[elLinkTarget.dataset.index];
        const elLinkActive = this._elTabs.querySelector(".tabs__btn_active");
        const elPaneShow = this._elTabs.querySelector(".tabs__pane_show");
        if (elLinkTarget === elLinkActive) {
          return;
        }
        elLinkActive ? elLinkActive.classList.remove("tabs__btn_active") : null;
        elPaneShow ? elPaneShow.classList.remove("tabs__pane_show") : null;
        elLinkTarget.classList.add("tabs__btn_active");
        elPaneTarget.classList.add("tabs__pane_show");
        this._elTabs.dispatchEvent(this._eventShow);
        elLinkTarget.focus();
      }
      showByIndex(index) {
        const elLinkTarget = this._elButtons[index];
        elLinkTarget ? this.show(elLinkTarget) : null;
      }
      _events() {
        this._elTabs.addEventListener("click", (e) => {
          const target = e.target.closest(".tabs__btn");
          if (target) {
            e.preventDefault();
            this.show(target);
          }
        });
      }
    }
    // переименование вкладок в категории моделей
    const categories = ["models_A", "models_B", "models_C", "models_D", "models_E", "models_F", "models_G", "models_H", "models_I", "models_J", "models_K", "models_L", "models_M", "models_N", "models_O", "models_P", "models_Q"];
    const tab_names = ["аниме", "лайнарт", "женские", "игры и кино", "техника и космос", "крипота", "макро", "мемные", "мужские", "мультфильмы", "пиксельарт", "трехмерная графика", "универсальные", "фотореализм", "фурри", "футанари", "художественные"];
    const buttons = document.querySelectorAll("div.tabs__nav > button");
    buttons.forEach(button => {
      const category = button.textContent;
      const index = categories.indexOf(category);
      if (index !== -1) {
        button.textContent = tab_names[index];
        button.setAttribute("category", category);
      }
    });
    // создание модального окошка со списком файлов при двойном клике по имени модели
    const modal = document.createElement('div');
    modal.setAttribute('id', 'modal_files');
    modal.style.display = 'none';
    const modalTitle = document.createElement('h2');
    const modalList = document.createElement('ul');
    const modalClose = document.createElement('a');
    modalClose.href = '#';
    modalClose.textContent = 'закрыть';
    modalClose.addEventListener('click', (e) => {
      e.preventDefault();
      modal.style.display = 'none';
    });
    modal.appendChild(modalTitle);
    modal.appendChild(modalList);
    modal.appendChild(modalClose);
    document.body.appendChild(modal);
    // грубая попытка рассчитать высоту вкладки чтобы уместить все модели
    // надежнее оказался display: grid, но у него некрасивая сортировка
    const panes = document.querySelectorAll(".tabs__pane");
    panes.forEach((pane) => {
      const labels = pane.querySelectorAll("label");
      const numLabels = labels.length;
      const maxLabelsPerColumn = 20; // сколько надо строк в столбце
      const labelHeight = 20; // примерная высота строки (в css вообще она 15)
      const gapHeight = 10; // высота промежутка (в css вообще она 12)
      const paneHeight = Math.min(numLabels, maxLabelsPerColumn) * (labelHeight + gapHeight) - gapHeight;
      pane.style.height = `${paneHeight}px`;
    // делаем имена моделей редактируемыми
      labels.forEach((label) => {
        label.setAttribute("contenteditable", "true");
        label.setAttribute("spellcheck", "false");
        label.setAttribute("edit", "false");
        label.addEventListener("focus", () => {
          label.setAttribute("edit", "true");
        });
        label.addEventListener("blur", () => {
          label.setAttribute("edit", "false");
        });
        label.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            label.blur();
          }
        });
        // убираем подсветку найденой модели через поиск при клике на нее
        label.addEventListener("click", function () {
          label.removeAttribute("highlighted");
        });
        // показываем список файлов для модели при двойном клике на ее имя
        labels.forEach(label => {
          label.addEventListener('dblclick', () => {
            // на всякий случай грузим заново данные из json
            fetch(url + '?_=' + new Date().getTime())
              // имена файлов только на английском, потому сразу загружаем как данные
              .then((response) => response.json())
              .then((data) => {
                const modelName = label.textContent;
                const modelFiles = data.models[modelName].split(', ');
                modalTitle.textContent = modelName;
                modalList.innerHTML = '';
                modelFiles.forEach(file => {
                  const lastDotIndex = file.lastIndexOf('.');
                  const fileName = file.slice(0, lastDotIndex);
                  const fileExtension = file.slice(lastDotIndex);
                  const listItem = document.createElement('li');
                  const fileNameSpan = document.createElement('span');
                  // имя файла делаем редактируемым
                  fileNameSpan.setAttribute('contenteditable', 'true');
                  fileNameSpan.setAttribute('class', 'filename');
                  fileNameSpan.setAttribute("spellcheck", "false");
                  fileNameSpan.textContent = fileName;
                  // а его расширение оставляем не редактируемым
                  const fileExtensionSpan = document.createElement('span');
                  fileExtensionSpan.textContent = fileExtension;
                  listItem.appendChild(fileNameSpan);
                  listItem.appendChild(fileExtensionSpan);
                  modalList.appendChild(listItem);
                  modal.style.display = 'block';
                });
                // добавляем кнопку удаления файла только для моделей с > 1 файлами
                if (modelFiles.length > 1) {
                  document.querySelectorAll('.filename').forEach(fileNameSpan => {
                    if (!fileNameSpan.parentNode.querySelector('button')) {
                      const deleteButton = document.createElement('button');
                      deleteButton.textContent = '×';
                      deleteButton.setAttribute("class", "delete_button");
                      const fileExtensionSpan = fileNameSpan.nextElementSibling;
                      fileNameSpan.parentNode.insertBefore(deleteButton, fileExtensionSpan.nextSibling);
                      // обработчик при клике на кнопку удаления
                      deleteButton.addEventListener('click', () => {
                        const model = modalTitle.textContent;
                        const file = fileNameSpan.textContent + (fileNameSpan.nextElementSibling ? fileNameSpan.nextElementSibling.textContent : '');
                        // отправляем запрос на сервер
                        fetch('/delete-file', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ model, file })
                        }).then(response => response.json()).then(data => {
                          // в случае если сервер одуплился, скрываем файл и помечаем удаленным
                          if (data.status === 'success') {
                            fileNameSpan.textContent = file.split('.')[0] + '_deleted.' + (file.split('.')[1] || '');
                            fileNameSpan.parentNode.style.display = 'none';
                            deleteButton.remove();
                          }
                        });
                      });
                    }
                  });
                }
              });
          });
        });
        // отправляем на сервер команду изменения имен моделей сразу в файл json при вводе символов
        labels.forEach(label => {
          label.addEventListener('input', () => {
            const category = document.querySelector("#container > div.tabs > div.tabs__nav > button.tabs__btn.tabs__btn_active").getAttribute('category');
            const model_index = Array.from(label.parentNode.children).indexOf(label);
            const model = label.textContent;
            fetch('/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ category, model_index, model })
            });
          });
        });
      });
    });
    // запуск конструктора вкладок
    new ItcTabs(".tabs");
    // обработчик кнопки отправки в хаггингфейс
    let isRunning = false;
    document.querySelector('#run_push2HF').addEventListener('click', () => {
      if (isRunning) {
        return;
      }
      isRunning = true;
      // на всякий случай, чтобы не делать даблкликов
      document.querySelector('#run_push2HF').setAttribute('disabled', 'disabled');
      fetch('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'run_push2HF' })
      })
        .then(response => response.text())
        .then(result => {
          // выводим ответ сервера на кнопку
          if (result.trim() === 'okay') {
            document.querySelector('#run_push2HF').textContent = 'okay';

          } else {
            document.querySelector('#run_push2HF').textContent = 'error';
          }
          isRunning = false;
        });
    });
    // скликивание первой вкладки при открытии страницы (костыль, чтобы сразу назначить активный класс)
    document.querySelector("div.tabs__nav > button:nth-child(1)").click();
    // функция чтобы можно было перемещать элементы мышкой
    function dragElement(elmnt) {
      let pos3 = 0, pos4 = 0;
      elmnt.addEventListener("mousedown", dragMouseDown);
      function dragMouseDown(e) {
        if (e.target !== elmnt || elmnt.getAttribute("contenteditable") === "true") {
          return;
        }
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.addEventListener("mouseup", closeDragElement);
        document.addEventListener("mousemove", elementDrag);
      }
      function elementDrag(e) {
        e.preventDefault();
        const dx = pos3 - e.clientX;
        const dy = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        if (elmnt.offsetTop - dy > 0) {
          elmnt.style.top = elmnt.offsetTop - dy + "px";
        }
        if (elmnt.offsetLeft - dx > 0 && elmnt.offsetLeft - dx < document.body.clientWidth) {
          elmnt.style.left = elmnt.offsetLeft - dx + "px";
        }
      }
      function closeDragElement() {
        document.removeEventListener("mouseup", closeDragElement);
        document.removeEventListener("mousemove", elementDrag);
      }
    }
    // делаем окошко со списком файлов перемещаемым
    dragElement(document.querySelector("#modal_files"));
    // поиск моделей по всем вкладкам
    const searchInput = document.querySelector("#search");
    const searchResult = document.querySelector("#search_result");
    const tabsContent = container.querySelector("div.tabs__content");
    const tabsNav = container.querySelector("div.tabs__nav");
    // обработка ввода текста в строку поиска
    searchInput.addEventListener("input", (event) => {
      const searchText = event.target.value.toLowerCase();
      const labels = tabsContent.querySelectorAll("label");
      searchResult.innerHTML = "";
      if (searchText === "") {
        return;
      }
      // при клике на результат поиска показываем где модель на вкладках и подсвечиваем
      labels.forEach((label) => {
        if (label.textContent.toLowerCase().includes(searchText)) {
          const resultItem = document.createElement("div");
          resultItem.textContent = label.textContent;
          resultItem.addEventListener("click", () => {
            const pane = label.closest("div.tabs__pane");
            const index = Array.from(tabsContent.children).indexOf(pane);
            const tabButton = tabsNav.children[index];
            tabButton.click();
            label.setAttribute("highlighted", "");
          });
          searchResult.appendChild(resultItem);
        }
      });
    });
    // очистка результатов при клике на кнопочку
    document.querySelector("#clear_search_results").addEventListener("click", () => {
      searchInput.value = "";
      searchResult.innerHTML = "";
    });
  })
  // ничего выше не выполнится, если json не был загружен 
  .catch((error) => {
    console.error("ошибка загрузки JSON:", error);
  });
// прячем информационное окошко при клике на "понятно"
document.querySelector("body > header > close").addEventListener('click', () => {
  document.querySelector("body > header").style.display = 'none';
});
// показываем информацию снова, при клике на кнопочку "ℹ"
document.querySelector("#information").addEventListener('click', () => {
  document.querySelector("body > header").removeAttribute("style");
});
// кнопочка для встраивания светлой темы для чудаков
const themeButton = document.querySelector("#theme");
themeButton.textContent = "🌞";
const light_theme = document.createElement('style');
light_theme.setAttribute('theme', 'light');
light_theme.textContent = `*{--close-hover-text-color:#000;--delete-button-text-color:#1b171f;--delete-button-hover-text-color:#5a0202;--text-color:#2a2a2a;--clear-search-results-text-color:#525454;--background-color:#f5f5f5;--header-background-color:#fff;--tabs-btn-active-background-color:#dcdcdc;--tabs-background-color:#f0f0f0;--tabs-border-color:#d8d8d8;--tabs-btn-background-color:#ebebeb;--modal-files-box-shadow:#999999f7;--search-result-background-color:#b0b0b0b3;--search-result-hover-background-color:#ffffff45;--search-result-hover-text-color:#2f2f2f;--tabs-btn-text-color:#737373;--run-push2HF-box-shadow--inset:#91b73a;--tabs-btn-active-text-color:#6f9d3a;--link-active-color:#a9f46f;--info-text-color:#88a94b;--link-hover-color:#85b61b;--run-push2HF-active-background-color:#6f9d3a00;--run-push2HF-hover-box-shadow-outset:#3eff007a;--link-color:#307b08;--run-push2HF-active-border-color:#327b072e;--highlighted-label-background:#0fa4013b;--modal-files-li-odd-before-color:#6f9d3a75;--modal-files-li-before-color:#6f9d3a75;--run-push2HF-background-color:#3a6707;--run-push2HF-active-text-color:#325a05fa;--run-push2HF-active-box-shadow-outset:#1c7003f7;--tabs-content-label-background:#c0dbad;--header-text-color:#ce4646;--delete-button-active-border-color:#d71e1e;--delete-button-hover-background-color:#ff0000b0;--delete-button-background-color:#ff00007d;--theme-hover-box-shadow-inset:#eac71a;--highlighted-label-before-background:#ffca00}`;
let isDarkMode = false;
themeButton.addEventListener("click", () => {
  if (isDarkMode) {
    themeButton.textContent = "🌞";
    light_theme.remove();
  } else {
    themeButton.textContent = "🌒";
    document.body.insertBefore(light_theme, document.body.lastChild);
  }
  isDarkMode = !isDarkMode;
});
// КОНЕЦ, И БОГУ СЛАВА!