const { dockStart } = require('@nlpjs/basic');
const fs = require('fs');

const assets = Runtime.getAssets();
const modelAsset = assets['/other/model.nlp'];

const functions = Runtime.getFunctions();
const userFunction = functions.user;
const productFunction = functions.product;
const cartFunction = functions.cart;

const { getUserByPhoneNumber, createUser, updateUser } = require(userFunction.path);
const { getProducts, sendProducts } = require(productFunction.path);
const { addItemToCart } = require(cartFunction.path);

const saveState = async (context, user, sender, newIntent) => {
    const userExists = user !== undefined;

    if (!userExists) {
        await createUser(context, sender, newIntent);
    } else {
        if (user.fields.State !== newIntent) {
            const userId = user.id;
            const fields = {
                State: newIntent,
            };
            await updateUser(context, userId, fields);
        }
    }
};

const handleIntent = async (context, input, sender, baseURL) => {
    const { intent } = input;
    let answer = '';
    const user = await getUserByPhoneNumber(context, sender);

    switch (intent) {
        case 'greeting':
            await saveState(context, user, sender, intent);
            answer = 'Hello there, I am Ashu. Would you like to see the items available in this store?';
            return answer;

        case 'farewell':
            await saveState(context, user, sender, intent);
            answer = 'Goodbye !!!';
            return answer;

        default:
            answer = "I am sorry but I didn't understand what you meant. Can you please rephrase?";
            return answer;

        case 'agreeing':
            if (user.fields.State === 'greeting') {
                await saveState(context, user, sender, 'showProducts');
                const products = await getProducts(context, baseURL, sender);
                await sendProducts(context, products, baseURL, sender);
                answer = '';
                return answer;
            } else if (user.fields.State === 'addToCart') {
                await saveState(context, user, sender, 'checkout');
                const url = `${baseURL}/index.html?userId=${user.id}`;
                answer = ` Click on the following link to checkout: \n ${url}`;
                return answer;
            } else {
                return answer;
            }

        case 'showProducts':
            await saveState(context, user, sender, intent);
            const products = await getProducts(context, baseURL, sender);
            await sendProducts(context, products, baseURL, sender);
            answer = '';
            return answer;

        case 'addToCart':
            await saveState(context, user, sender, intent);
            const entities = [...input.entities];
            const itemAddedToCart = await addItemToCart(context, user, entities);
            answer = itemAddedToCart ? 'Item successfully added to cart. Would you like to cart?' : 'Failed to add the item to checkout';
            return answer;
        case 'checkout':
            await saveState(context, user, sender, intent);
            const url = `${baseURL}/index.html?userId=${user.id}`;
            answer = ` Click on the following link to checkout: \n ${url}`;
            return answer;

    }
};



const handleMessage = async (context, message, sender, baseURL) => {
    const modelAssetPath = modelAsset.path;

    const dock = await dockStart({
        settings: {
            nlp: {
                modelFileName: 'model.private.nlp',
                languages: ['en'],
                forceNER: true,
            },
        },
        use: ['Basic', 'BuiltinMicrosoft', 'LangEn'],
    });

    const builtin = dock.get('builtin-microsoft');
    const ner = dock.get('ner');
    ner.container.register('extract-builtin-??', builtin, true);
    const nlp = dock.get('nlp');

    if (fs.existsSync(modelAssetPath)) {
        nlp.load(modelAssetPath);
    } else {
        return 'could not load model';
    }

    const result = await nlp.process(message);
    const answer = await handleIntent(context, result, sender, baseURL);

    return answer;

};


exports.handler = async function (context, event, callback) {
    const sender = event.From.replace('whatsapp:', '');
    const incomingMessage = event.Body;
    const baseURL = `https://${event.request.headers.host}`;

    const answer = await handleMessage(context, incomingMessage, sender, baseURL);

    const reply = new Twilio.twiml.MessagingResponse();
    reply.message(answer);

    callback(null, reply);
};
