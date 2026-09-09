export interface BasePageConfig {
    type: 'about' | 'publication' | 'card' | 'text' | 'message';
    title: string;
    description?: string;
}

export interface PublicationPageConfig extends BasePageConfig {
    type: 'publication';
    source: string;
}

export interface TextPageConfig extends BasePageConfig {
    type: 'text';
    source: string;
    /** Optional JSON source rendered via the geeky `cv.json` toggle. */
    json_source?: string;
}

export interface CardItem {
    title: string;
    subtitle?: string;
    date?: string;
    content?: string;
    tags?: string[];
    link?: string;
    image?: string;
}

export interface CardPageConfig extends BasePageConfig {
    type: 'card';
    items: CardItem[];
    justify?: boolean;
    /** Card layout variant. "git" renders items as a git-log style timeline. */
    layout?: 'default' | 'git';
}

export interface MessagePageConfig extends BasePageConfig {
    type: 'message';
    endpoint: string;
}
