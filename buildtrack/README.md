# BuildTrack — MVP

Сервис отслеживания строительства и ремонта.
Три роли: Прораб · Рабочий · Заказчик.

## Быстрый старт

```bash
npm install
npm run dev
```

Откроется http://localhost:5173 — приложение работает на локальных данных.

## Структура проекта

```
src/
  store/
    useStore.js      # Zustand store — весь стейт, CRUD операции
  components/
    UI.jsx           # Переиспользуемые компоненты (Button, Badge, StatCard...)
    TaskList.jsx     # Список задач с edit/delete
    TaskModal.jsx    # Модалка добавления/редактирования задачи
    ConfirmModal.jsx # Подтверждение удаления
  pages/
    index.jsx        # Все страницы: Dashboard, Tasks, Tools, Team...
  lib/
    supabase.js      # Клиент Supabase (пока заглушка)
  App.jsx            # Роутинг, topbar, sidebar
  main.jsx           # Entry point
  index.css          # Все стили
```

## Подключение Supabase

1. Создай проект на https://supabase.com
2. Скопируй `.env.example` → `.env`
3. Вставь `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`
4. Создай таблицы в Supabase SQL Editor:

```sql
create table tasks (
  id          bigint primary key generated always as identity,
  text        text not null,
  done        boolean default false,
  who         text,
  stage       text,
  priority    text default 'normal',
  project_id  bigint,
  created_at  timestamptz default now()
);

create table tools (
  id      bigint primary key generated always as identity,
  name    text not null,
  loc     text,
  status  text default 'active'
);

create table projects (
  id       bigint primary key generated always as identity,
  name     text not null,
  progress int default 0,
  stage    text,
  client   text
);
```

5. Замени локальные данные в `useStore.js` на вызовы Supabase:

```js
// Пример: загрузка задач
const { data } = await supabase.from('tasks').select('*')
```

## Деплой на Vercel

```bash
npm install -g vercel
vercel
```

Добавь переменные окружения в настройках проекта на vercel.com.
