# Cities of the World — Docker CSV Analytics

Проект генерирует CSV-данные о городах мира и строит по ним HTML-отчёт с агрегированной статистикой. Генератор и аналитик работают в изолированных Docker-контейнерах и обмениваются данными через примонтированную директорию на хосте — контейнеры не знают друг о друге и не зависят друг от друга.

---

## Структура проекта

```
hw3_tp/
├── generator/
│   ├── Dockerfile        ← рецепт образа генератора (python:3.11-alpine)
│   └── generate.py       ← генерирует data.csv с данными о городах мира
├── reporter/
│   ├── Dockerfile        ← рецепт образа аналитика (node:20-alpine)
│   ├── report.js         ← читает data.csv, строит HTML-отчёт
│   ├── package.json      ← зависимость: csv-parse
│   └── default.conf      ← конфиг nginx: отдаёт report.html как главную страницу
├── data/                 ← общая директория: сюда оба контейнера пишут файлы
├── local_data/           ← для локального запуска генератора без Docker
├── run.sh                ← единая точка управления всем проектом
└── README.md
```

---

## Быстрый старт

```bash
chmod +x run.sh

./run.sh build_generator
./run.sh run_generator
./run.sh build_reporter
./run.sh run_reporter
```

После этого в `data/` появятся `data.csv` и `report.html`.

---

## Все команды run.sh

| Команда | Что делает |

| `build_generator` | Собирает Docker-образ `city-generator` из `generator/Dockerfile` |
| `run_generator` | Запускает контейнер генератора, монтирует `data/` → создаёт `data/data.csv` |
| `create_local_data` | То же самое, но монтирует `local_data/` — для локальной отладки |
| `build_reporter` | Собирает Docker-образ `city-reporter` из `reporter/Dockerfile` |
| `run_reporter` | Запускает контейнер аналитика, читает `data/data.csv` → создаёт `data/report.html` |
| `structure` | Выводит дерево всех файлов и директорий проекта |
| `clear_data` | Удаляет `data/*.csv` и `data/*.html`, папка остаётся пустой |
| `inside_generator` | Запускает контейнер генератора и выводит содержимое `/data` изнутри |
| `inside_reporter` | Запускает контейнер аналитика и выводит содержимое `/data` изнутри |
| `report_server` | Запускает `nginx:alpine` на порту 8080, главная страница — `report.html` |

---

## Веб-сервер и просмотр отчёта в браузере

### Архитектура: почему три уровня

Когда проект запускается в GitHub Codespaces, между браузером и файлом стоят три уровня изоляции:

```
Браузер на локальном ПК
        │
        │  HTTPS-запрос на *.app.github.dev
        │  (GitHub работает как обратный прокси — перехватывает запрос
        │   и пробрасывает его внутрь виртуальной машины Codespaces)
        ▼
Виртуальная машина GitHub Codespaces
        │  (это Linux-сервер в облаке)
        │  порт 8080 хоста ←→ порт 80 контейнера
        │  (флаг -p 8080:80 в docker run создаёт это соответствие)
        ▼
Docker-контейнер nginx:alpine
        │  (изолированный процесс внутри VM Codespaces)
        │  том 1: -v data/:/usr/share/nginx/html  → nginx видит report.html
        │  том 2: -v reporter/default.conf:/etc/nginx/conf.d/default.conf
        │          → nginx знает, что index-файл это report.html, а не index.html
        ▼
/usr/share/nginx/html/report.html  ←  открывается по адресу /
```

Именно поэтому `localhost:8080` не работает из браузера — `localhost` указывает на локальный компьютер, а nginx работает на удалённой VM. GitHub решает это через механизм проброса портов: автоматически создаёт публичный HTTPS-адрес, который туннелирует трафик внутрь Codespaces.

### Конфиг nginx (`reporter/default.conf`)

По умолчанию nginx ищет файл `index.html` при обращении к корню `/`. Поскольку отчёт называется `report.html`, нужно явно указать это в конфиге:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index report.html;
}
```

Этот файл монтируется в контейнер как `-v reporter/default.conf:/etc/nginx/conf.d/default.conf:ro` — он заменяет дефолтный конфиг nginx внутри образа. Теперь при обращении к `/` nginx сразу отдаёт `report.html`.

### Шаг 1 — Сгенерировать данные и отчёт

```bash
./run.sh build_generator && ./run.sh run_generator
./run.sh build_reporter  && ./run.sh run_reporter
ls data/
# data.csv  report.html
```

### Шаг 2 — Запустить nginx

```bash
./run.sh report_server
```

Docker запустит контейнер в фоновом режиме (`-d`). Монтируются два тома: папка `data/` как корень сайта и `default.conf` как конфиг nginx.

### Шаг 3 — Найти публичную ссылку в Codespaces

В VS Code внизу есть панель вкладок: **TERMINAL / PROBLEMS / OUTPUT / PORTS**.

Открыть вкладку **PORTS**. Найти строку с портом **8080**. В колонке **Forwarded Address** будет ссылка вида:

```
https://имя-codespace-8080.app.github.dev
```

Если строки с 8080 нет — нажми **Add Port**, введи `8080`, Enter.

### Шаг 4 — Открыть отчёт

Нажать на иконку глобуса 🌐 рядом со ссылкой. Отчёт откроется сразу — дописывать `/report.html` не нужно, nginx сделает это автоматически благодаря `default.conf`.

### Шаг 5 — Остановить сервер

```bash
docker stop report-server
```

Флаг `--rm` гарантирует, что контейнер удалится автоматически после остановки.

---

## Как работает каждая часть проекта

### Монтирование томов (`-v`)

По умолчанию контейнер полностью изолирован: файлы, которые он создаёт, живут только внутри него и исчезают при остановке. Флаг `-v` создаёт двустороннюю связь между директорией на хосте и директорией внутри контейнера:

```bash
docker run --rm -v "$(pwd)/data":/data city-generator
#                  ^^^^^^^^^^^^^^  ^^^^^
#                  путь на хосте   путь в контейнере
```

Контейнер пишет файл в `/data/data.csv` → он сразу появляется в `data/data.csv` на хосте. Контейнер останавливается и удаляется (`--rm`) → файл на хосте остаётся.

Именно поэтому генератор и аналитик могут обмениваться данными, не зная ничего друг о друге: один пишет в примонтированную папку, другой читает из неё.

### Dockerfile генератора

```dockerfile
FROM python:3.11-alpine
WORKDIR /app
COPY generate.py .
CMD ["python", "generate.py", "/data"]
```

`alpine` — минималистичный Linux (~5 МБ), в котором уже есть Python. `WORKDIR` создаёт рабочую директорию внутри образа. `COPY` копирует скрипт с хоста в образ во время сборки. `CMD` задаёт команду, которая выполняется при каждом `docker run`.

### Dockerfile аналитика

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY report.js .
CMD ["node", "report.js"]
```

`RUN npm install` выполняется **при сборке образа** (`docker build`), а не при запуске. Зависимости устанавливаются один раз и кешируются в слой образа — при каждом `docker run` контейнер стартует мгновенно.

`package.json` копируется до `report.js` намеренно: Docker кеширует слои по порядку. Если изменился только `report.js`, слой с `npm install` не пересобирается — Docker возьмёт его из кеша.

### Проброс портов

```bash
docker run -p 8080:80 nginx:alpine
#              ^^^^  ^^
#         порт хоста  порт контейнера
```

Nginx внутри контейнера слушает порт 80. Флаг `-p 8080:80` говорит Docker: "любой запрос на порт 8080 хоста перенаправляй на порт 80 контейнера". В Codespaces GitHub дополнительно создаёт туннель от публичного HTTPS-адреса до порта 8080 виртуальной машины.
