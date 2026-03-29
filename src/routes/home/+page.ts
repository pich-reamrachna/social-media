export const load = () => {
	const current_user = {
		name: 'Selena Gomez',
		handle: 'selenagomez',
		avatar_url: 'https://i.pravatar.cc/150?img=47'
	}

	const posts = [
		{
			id: '1',
			author: {
				name: 'Taylor Swift',
				handle: 'taylorswift13',
				avatar_url: 'https://i.pravatar.cc/150?img=1',
				is_verified: true,
				role: 'SINGER · SONGWRITER'
			},
			content:
				"The shift towards neo-brutalism in digital interfaces isn't just a trend; it's a rebellion against the over-polished aesthetic of the last decade. Raw typography and high-contrast energy are here to stay. ⚡",
			images: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80'],
			timestamp: '2h',
			stats: { comments: 124, echo_count: 48, likes: 1200 }
		},
		{
			id: '2',
			author: {
				name: 'PIKOTARO',
				handle: 'pikotaro_ppap',
				avatar_url: 'https://i.pravatar.cc/150?img=53',
				is_verified: true,
				role: 'ARTIST · COMEDIAN'
			},
			content:
				'I have a pen. I have an apple. Ugh — Apple Pen. 🍎🖊️ But seriously, creativity is just connecting things that seem unconnected. Stay weird. Stay curious.',
			images: [] as string[],
			timestamp: '5h',
			stats: { comments: 89, echo_count: 12, likes: 642 }
		},
		{
			id: '3',
			author: {
				name: 'Selena Gomez',
				handle: 'selenagomez',
				avatar_url: 'https://i.pravatar.cc/150?img=47',
				is_verified: true,
				role: 'SINGER · ACTRESS'
			},
			content: 'Behind the scenes at the new shoot. Feeling so grateful for this team. 🎌✨',
			images: [
				'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=400&q=80',
				'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80'
			],
			timestamp: '8h',
			stats: { comments: 2400, echo_count: 902, likes: 18500 }
		}
	]

	const trending = [
		{ category: 'TECHNOLOGY · TRENDING', tag: '#NeuralInterface', count: '45.2K' },
		{ category: 'ART · TRENDING', tag: '#DigitalNoir', count: '12.9K' },
		{ category: 'MUSIC · TRENDING', tag: 'Synthetix Core', count: '8.1K' }
	]

	const who_to_follow = [
		{
			name: 'Billie Eilish',
			handle: 'billieeilish',
			avatar_url: 'https://i.pravatar.cc/150?img=5'
		},
		{
			name: 'Bad Bunny',
			handle: 'badbunnypr',
			avatar_url: 'https://i.pravatar.cc/150?img=60'
		},
		{
			name: 'Dua Lipa',
			handle: 'dualipa',
			avatar_url: 'https://i.pravatar.cc/150?img=9'
		}
	]

	return { current_user, posts, trending, who_to_follow }
}
