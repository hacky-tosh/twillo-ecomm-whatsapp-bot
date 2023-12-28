const cartListEl = document.getElementById('cartList');
const amountTxtEl = document.getElementById('amountText');

const baseURL = window.location.origin;
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('userId');
let amount = 0;
const sendRequest = async (body) => {
    const url = `${baseURL}/checkout`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    }).catch((err) => {
        console.error(err);
        return undefined;
    });

    const data = response !== undefined ? await response.json() : undefined;
    return data;
};
const initPayPalButton = () => {
    paypal.Buttons({
        style: {
            shape: 'rect',
            color: 'gold',
            layout: 'vertical',
            label: 'paypal',
        },
        createOrder: async (data, actions) => {
            return actions.order.create({
                purchase_units: [{ amount: { currency_code: 'USD', value: amount } }],
            });
        },
        onApprove: (data, actions) => {
            return actions.order.capture().then(async (details) => {
                const form = document.getElementById('form');
                const formData = new FormData(form);
                const name = formData.get('name');
                const address = formData.get('address');
                const orderId = details.id;
                const payerId = details.payer.payer_id;
                const emailAddress = details.payer.email_address;

                const body = {
                    action: 'checkout',
                    userId,
                    orderId,
                    name,
                    address,
                    payerId,
                    emailAddress,
                    amount,
                };

                const res = await sendRequest(body);
                if (res.success === true) {
                    alert(`Transaction completed by ${details.payer.email_address}`);
                } else {
                    alert('Failed to create order');
                }
            });
        },
        onCancel(data) {
            console.log('Transaction cancelled', data);
            alert('Transaction cancelled');
        },
        onError: (err) => {
            console.error(err);
            alert('Transaction error');
        }
    }).render('#paypal-button-container');
};

const getCheckoutInformation = async () => {
    const body = {
        action: 'getCheckoutInformation',
        userId,
    };
    const { cartItems, name, address } = await sendRequest(body);
    const inputName = document.getElementById('inputName');
    const inputAddress = document.getElementById('inputAddress');
    inputName.setAttribute('value', name);
    inputAddress.setAttribute('value', address);

    if (cartItems !== undefined) {
        for (let i = 0; i < cartItems.length; i++) {
            const price = cartItems[i].product.Price;
            const { quantity } = cartItems[i];
            const title = cartItems[i].product.Title;
            const imageURL = `${baseURL}/images/${cartItems[i].product.Image}`;
            const itemTotal = quantity * price;
            amount += itemTotal;

            const listItemElement = document.createElement('li');
            listItemElement.className = 'list-group-item';
            listItemElement.innerHTML = `<div class="row">
                <div class="col-2">
                  <img src="${imageURL}" class="img-fluid"
                    alt="...">
                </div>
                <div class="col-4">${title}</div>
                <div class="col-2">$${price}</div>
                <div class="col-2">x ${quantity}</div>
                <div class="col-2">$${itemTotal}</div>
                </div>`;
            cartListEl.appendChild(listItemElement);
            console.log('el', listItemElement);
        }
        amountTxtEl.innerText = `$${amount}`;
        initPayPalButton();
    }

};

getCheckoutInformation();
