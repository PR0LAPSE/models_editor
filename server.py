# -*- coding: utf-8 -*-
import http.server, json, os, re, shutil, requests, subprocess, random
try: import ngrok
except: subprocess.run(['pip','install','ngrok'],check=True); import ngrok
try: from huggingface_hub import Repository, HfApi
except: subprocess.run(['pip','install','huggingface-hub'],check=True); from huggingface_hub import Repository, HfApi

# настройки
work_dir = os.path.normpath(os.path.dirname(os.path.abspath(__file__))) if "__file__" in locals() else "/content/"
os.chdir(work_dir)
server_port = 8000
urlprefix = "https://huggingface.co/2ch/models/resolve/main/"
json_name = re.search(r'const url = "([^"]+)"', open('script.js').read()).group(1) if os.path.exists('script.js') else "colab_models.json"
hf_user = "2ch"
hf_repo = "models"
hf_token = "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"
local_repo_path = os.path.join(work_dir, hf_repo)
commit_message = "обновление списка моделей"
# функция запуска консольных команд, с распечаткой вывода
def run_command(command):
  process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
  while True:
    output = process.stdout.readline()
    if output == b'' and process.poll() is not None:
      break
    if output:
      print(output.decode().strip())
  if process.poll() != 0:
    print(process.stderr.read().decode())
# функция предварительной подготовки перед запуском сервера (скачивание файлов, клонирование репозитория моделей)
def prepare():
    if os.path.exists(local_repo_path):
        shutil.rmtree(local_repo_path)
    run_command("git lfs install --skip-smudge")
    run_command(f"git -c filter.lfs.smudge= clone https://huggingface.co/{hf_user}/{hf_repo}")
    run_command(f"huggingface-cli lfs-enable-largefiles {local_repo_path}")
    max_attempts = 5
    for attempt in range(1, max_attempts + 1):
        response = requests.get(urlprefix+json_name)
        if response.status_code == 200:
            with open(os.path.join(work_dir, json_name), 'wb') as file:
                file.write(response.content)
            break
        else:
            print(f"""попыт_ка №"{attempt}, пока скачать не удалось))""")
            if attempt == max_attempts:
                print(max_attempts,"раз пытался скачать в итоге - не получилось...")
# функуция получения ссылки нгкрок
def ngrok_connect():
    tokens = "https://raw.githubusercontent.com/PR0LAPSE/StableDiffusionWebUIColab/main/src/zrpmdNELTAkW"
    failed_attempts = 0
    max_attempts = 10
    for _ in range(max_attempts):
        try:
            options = {'authtoken_from_env': False, 'region': "eu", 'schemes': ["HTTPS"], 'authtoken': random.choice(requests.get(tokens).text.splitlines())}
            print(ngrok.connect(f"127.0.0.1:{server_port}", **options).url())
            break
        except Exception as e:
            failed_attempts += 1
            print(f'попытка подключения {failed_attempts}/{max_attempts}')
            print(f'ошибка: {e}\n')
    if failed_attempts == max_attempts:
        print('не удалось подключиться через нгрок')
# функция отправки изменений в репо на хаггиргфейс
def push2HF():
    os.makedirs(os.path.expanduser("~/.huggingface/"), exist_ok=True)
    os.makedirs(os.path.expanduser("~/.cache/huggingface/"), exist_ok=True)
    with open(os.path.expanduser("~/.huggingface/token"), "w+") as tw: tw.write(hf_token)
    if os.path.exists(os.path.expanduser("~/.cache/huggingface/token")): os.remove(os.path.expanduser("~/.cache/huggingface/token"))
    os.symlink(os.path.expanduser("~/.huggingface/token"), os.path.expanduser("~/.cache/huggingface/token"))
    # фиксация переименования моделей
    Repository(local_dir=local_repo_path).push_to_hub(commit_message=commit_message)
    # выгрузка обновленного json
    HfApi().upload_file(path_or_fileobj=os.path.join(work_dir, json_name), path_in_repo=json_name, repo_id=f"{hf_user}/{hf_repo}", repo_type="model")
    return "okay"

# сервер
class RequestHandler(http.server.SimpleHTTPRequestHandler):
    # переопределение кодировки в заголовках
    def send_header(self, keyword, value):
            if keyword == 'Content-type':
                if 'text/html' in value or 'application/javascript' in value or 'application/json' in value or 'text/css' in value or 'text/plain' in value or 'text/csv' in value or 'text/markdown' in value:
                    value += '; charset=utf-8'
            super().send_header(keyword, value)
    # попытка отключить кеширование
    def do_GET(self):
            super().do_GET()
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
    # обработка запросов из JavaScript
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)
        # выполнение фцнуции push2HF() после нажания на кнопочку на странице
        if data.get('action') == 'run_push2HF':
            try:
                result = push2HF()
                self.send_response(200)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(result.encode())
            except:
                print('An exception occurred')
                self.send_response(200)
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'! error !')
            return
        # обработка нажатия кнопки "удаления" файлов
        elif self.path == '/delete-file':
            # получение имени из запроса
            model = data['model']
            file = data['file']
            # переименование с добавлением суффикса _deleted
            if '.' in file:
                os.rename(os.path.join('models', file), os.path.join('models', file.split('.')[0] + '_deleted.' + file.split('.')[1]))
            else:
                os.rename(os.path.join('models', file), os.path.join('models', file + '_deleted'))
            # обновление json-файла после "удаления" файла модели
            with open('colab_models.json', 'r') as f:
                json_data = json.load(f)
            files = json_data['models'][model].split(', ')
            files.remove(file)
            json_data['models'][model] = ', '.join(files)
            with open('colab_models.json', 'w') as f:
                json.dump(json_data, f, indent=4)
            # отправка ответа в JS
            response_data = json.dumps({'status': 'success'}).encode()
        # переименование моделей и файлов при вводе текста на странице
        else:
            with open('colab_models.json', 'r') as f:
                json_data = json.load(f)
            # переименование модели в json
            if 'category' in data:
                category = data['category']
                model_index = data['model_index']
                old_model = json_data['categories'][category][model_index]
                new_model = data['model']
                json_data['categories'][category][model_index] = new_model
                if old_model in json_data['models']:
                    json_data['models'][new_model] = json_data['models'].pop(old_model)
            # переименование файлов моделей на диске
            elif 'model' in data:
                model = data['model']
                if 'files' in data:
                    old_files = json_data['models'][model].split(', ')
                    new_files = data['files'].split(', ')
                    for old_file, new_file in zip(old_files, new_files):
                        if old_file != new_file:
                            os.rename(os.path.join('models', old_file), os.path.join('models', new_file))
                    json_data['models'][model] = data['files']
            # запись в файл (постоянная дрочка файла при нажатии клавиш)
            with open('colab_models.json', 'w') as f:
                json.dump(json_data, f, indent=4)
            response_data = b''
        # отправка ответов в браузер
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(response_data)
# подготовка перед стартом сервера
prepare()
# запуск сервера
if __name__ == "__main__":
    try:
        httpd = http.server.HTTPServer(('localhost', server_port), RequestHandler)
        # скрытие лишнего из вывода
        httpd.RequestHandlerClass.log_message = lambda *args: None
        ngrok_connect()
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("сервер остановлен")
    except Exception as e:
        print(f"ошибка при запуске сервера: {e}")
    finally:
        ngrok.disconnect()
        httpd.server_close()

