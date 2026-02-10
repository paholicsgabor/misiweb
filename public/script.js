document.addEventListener('DOMContentLoaded', () => {

    // 1. Termékek definiálása
    const products = [
        { id: 1, name: 'Alma', price: 150, emoji: '🍎', barcodes: ['1001'] },
        { id: 2, name: 'Banán', price: 200, emoji: '🍌', barcodes: ['1002'] },
        { id: 3, name: 'Narancs', price: 180, emoji: '🍊', barcodes: ['1003'] },
        { id: 4, name: 'Szőlő', price: 500, emoji: '🍇', barcodes: ['1004'] },
        { id: 5, name: 'Dinnye', price: 800, emoji: '🍉', barcodes: ['1005'] },
        { id: 6, name: 'Eper', price: 600, emoji: '🍓', barcodes: ['1006'] },
        { id: 7, name: 'Sajt', price: 1200, emoji: '🧀', barcodes: ['1007'] },
        { id: 8, name: 'Kenyér', price: 450, emoji: '🍞', barcodes: ['1008'] },
        { id: 9, name: 'Nyuszieledel (Bunny)', price: 2500, emoji: '🐇', barcodes: ['899003433', '899003424'] },
        { id: 10, name: 'Muffinok (Muffins)', price: 550, emoji: '🧁', barcodes: ['899003432', '899003429'] },
        { id: 11, name: 'Forró pite (Hot pie)', price: 700, emoji: '🥧', barcodes: ['899003460'] },
        { id: 12, name: 'Paradicsomketchup (Tomato ketchup)', price: 600, emoji: '🍅', barcodes: ['899003464'] },
        { id: 13, name: 'Szeletelt őszibarack (Sliced peaches)', price: 850, emoji: '🍑', barcodes: ['899003456'] },
        { id: 14, name: 'Tea (Yellow label)', price: 900, emoji: '🫖', barcodes: ['899003454'] },
        { id: 15, name: 'Tej (Milk)', price: 350, emoji: '🥛', barcodes: ['899003468', '899003455'] },
        { id: 16, name: 'Cukordrazsé (Mentos)', price: 250, emoji: '🍬', barcodes: ['899003417', '899003418', '899003420'] },
        { id: 17, name: 'Narancslé (Orange juice)', price: 450, emoji: '🧃', barcodes: ['899003442'] },
        { id: 18, name: 'Csokoládétej (Chocolate milk)', price: 400, emoji: '🍫', barcodes: ['899003461'] },
        { id: 19, name: 'Forró kakaó (Hot Cocoa)', price: 300, emoji: '☕', barcodes: ['899003426'] },
        { id: 20, name: 'Csokis pillecukor (Super dickmann\'s)', price: 950, emoji: '😋', barcodes: ['899003445'] },
        { id: 21, name: 'Gyümölcsös Gumicukor (Nimm2)', price: 480, emoji: '🐻', barcodes: ['899003421', '899003422'] },
        { id: 22, name: 'Vajas keksz (Leibniz)', price: 520, emoji: '🍪', barcodes: ['899003436', '899003435'] },
        { id: 23, name: 'Cukorka (Chupa chups kaubonbon)', price: 150, emoji: '🍭', barcodes: ['899003423'] },
        { id: 24, name: 'Pizza (Piccolinis)', price: 1100, emoji: '🍕', barcodes: ['899003434', '899003431'] },
        { id: 25, name: 'Gyümölcslé (Capri-sun)', price: 280, emoji: '🧃', barcodes: ['899003443'] },
        { id: 26, name: 'Abc Süti', price: 400, emoji: '🔤', barcodes: ['899003428', '899003430', '899003427'] },
        { id: 27, name: 'Csomag a ups-ról (Package from ups)', price: 3000, emoji: '📦', barcodes: ['899003438', '899003437'] },
        { id: 28, name: 'Gyógycukorka (Ricola)', price: 750, emoji: '🌿', barcodes: ['899003440', '899003439'] },
        { id: 29, name: 'Csokitáblák (Chocolate bars)', price: 650, emoji: '🍫', barcodes: ['899003470'] },
        { id: 30, name: 'Gyümölcsízű nyalókák (Chupa chups fruit lollipops)', price: 120, emoji: '🍭', barcodes: ['899003452'] },
        { id: 31, name: 'Kávé (Caffee)', price: 1500, emoji: '☕', barcodes: ['899003471'] },
        { id: 32, name: 'Fagyasztott burgonya (McCain)', price: 1300, emoji: '🍟', barcodes: ['899003446'] },
        { id: 33, name: 'Narancslé (Pfanner)', price: 550, emoji: '🧃', barcodes: ['899003441'] },
        { id: 34, name: 'Mosószer (Super clean)', price: 2800, emoji: '🧼', barcodes: ['899003462'] },
        { id: 35, name: 'Joghurt (Yoghurt)', price: 220, emoji: '🍦', barcodes: ['899003465'] },
        { id: 36, name: 'Mogyorós csoki (Milk chocolate)', price: 700, emoji: '🍫', barcodes: ['899003472'] },
        { id: 37, name: 'Fánk (Doughnut)', price: 300, emoji: '🍩', barcodes: ['899003469'] },
        { id: 38, name: 'Halkonzerv', price: 750, emoji: '🥫', barcodes: ['899003457'] },
        { id: 39, name: 'Borsókonzerv', price: 550, emoji: '🫛', barcodes: ['899003458'] },
        { id: 40, name: 'Rántott sajt', price: 1100, emoji: '🧀', barcodes: ['899003450'] },
        { id: 41, name: 'Karamella', price: 420, emoji: '🍮', barcodes: ['899003473'] },
        { id: 42, name: 'Pizza', price: 1800, emoji: '🍕', barcodes: ['899003444'] },
        { id: 43, name: 'Só', price: 200, emoji: '🧂', barcodes: ['899003459'] },
        { id: 44, name: 'Kevert zöldségek (Mixed Vegetables)', price: 980, emoji: '🥗', barcodes: ['899003447'] },
        { id: 45, name: 'Krémes spenót (Rahm-Spinat)', price: 850, emoji: '🥬', barcodes: ['899003449'] },
        { id: 46, name: 'Leveskonzerv (Delicious Soup)', price: 650, emoji: '🍲', barcodes: ['899003453'] },
        { id: 47, name: 'Farfalle tészta', price: 450, emoji: '🍝', barcodes: ['899003448'] },
        { id: 48, name: 'Krumplipüré por (Stocki)', price: 950, emoji: '🥔', barcodes: ['899003474'] },
        { id: 49, name: 'Epres sütemény (Strawberry Delicacy)', price: 1200, emoji: '🍰', barcodes: ['899003466'] },
        { id: 50, name: 'Salátaöntet (Salad Dressing)', price: 600, emoji: '🫙', barcodes: ['899003419'] },
        { id: 51, name: 'Tojás (12 db)', price: 900, emoji: '🥚', barcodes: ['899003451'] },
        { id: 52, name: 'Fagylalt (Ice Cream)', price: 1300, emoji: '🍨', barcodes: ['899003463'] },
        { id: 53, name: 'Vaj (Feine Butter)', price: 800, emoji: '🧈', barcodes: ['899003467'] },
    ];

    // 2. Elemek kinyerése a HTML-ből
    const productListDiv = document.getElementById('product-list');
    const cartItemsUl = document.getElementById('cart-items');
    const totalPriceSpan = document.getElementById('total-price');
    const resetButton = document.getElementById('reset-button');
    const barcodeInput = document.getElementById('barcode-input');
    const printButton = document.getElementById('print-button');

    let cart = []; // A kosár tartalma

    // A termékek megjelenítése már nem szükséges, mivel csak vonalkóddal dolgozunk.
    // function displayProducts() { ... }

    // 4. Termék hozzáadása a kosárhoz
    function addToCart(product) {
        cart.push(product);
        updateCart();
    }

    // 5. Kosár frissítése (megjelenítés és összegzés)
    function updateCart() {
        cartItemsUl.innerHTML = ''; // Töröljük a korábbi listát
        let total = 0;

        cart.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.name} - ${item.price} Ft`;
            cartItemsUl.appendChild(li);
            total += item.price; // Összeadjuk az árakat
        });

        totalPriceSpan.textContent = total;
    }

    // 6. Kosár törlése
    resetButton.addEventListener('click', () => {
        cart = [];
        updateCart();
    });

    // Nyomtatás gomb eseménykezelője
    printButton.addEventListener('click', () => {
        window.print();
    });

    // 7. Vonalkód kezelése
    barcodeInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const barcode = barcodeInput.value.trim();
            const product = products.find(p => p.barcodes && p.barcodes.includes(barcode));

            if (product) {
                addToCart(product);
                barcodeInput.value = ''; // Mező kiürítése
            } else {
                alert('A beolvasott vonalkódhoz nem található termék!');
            }
        }
    });

    // Az alkalmazás indításakor már nem kell megjeleníteni a termékeket.
    // displayProducts();
});
