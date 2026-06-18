from datetime import datetime
import random
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder='.', static_url_path='')

SERVICES = {
    'econom': {'title': 'Эконом', 'base': 120, 'per_km': 35},
    'comfort': {'title': 'Комфорт', 'base': 210, 'per_km': 45},
    'business': {'title': 'Бизнес', 'base': 390, 'per_km': 65},
}

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/api/estimate', methods=['POST'])
def estimate():
    data = request.get_json(force=True, silent=True) or {}
    service_key = data.get('service', 'econom')
    service = SERVICES.get(service_key, SERVICES['econom'])
    from_addr = data.get('from', '').strip()
    to_addr = data.get('to', '').strip()
    distance = 0
    if from_addr and to_addr:
        distance = max(3, min(20, (len(from_addr) + len(to_addr)) // 5))
    price = service['base'] + distance * service['per_km']
    eta = max(5, distance * 4)
    return jsonify(
        service=service['title'],
        distance=distance,
        price=price,
        eta=eta,
        currency='₽',
    )

@app.route('/api/book', methods=['POST'])
def book():
    data = request.get_json(force=True, silent=True) or {}
    required = ['from', 'to', 'phone', 'time', 'service', 'price', 'payment']
    missing = [name for name in required if not data.get(name)]
    if missing:
        return jsonify(error='Отсутствуют поля: ' + ', '.join(missing)), 400

    order_id = f"YT-{random.randint(100000, 999999)}"
    try:
        dt = datetime.fromisoformat(data['time'])
        time_text = dt.strftime('%d.%m.%Y %H:%M')
    except ValueError:
        time_text = data['time']

    return jsonify(
        orderId=order_id,
        status='confirmed',
        route=f"{data['from']} → {data['to']}",
        service=data['service'],
        payment=data['payment'],
        price=f"{data['price']} ₽",
        time=time_text,
    )

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8000, debug=True)
